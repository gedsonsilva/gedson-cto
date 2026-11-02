"""Exercise Make with a fake npm, plus a real local development-server smoke test."""
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.request
import xml.etree.ElementTree as ET

WEBSITE = Path(__file__).resolve().parents[1]


class MakefileTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='website make ')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copy2(WEBSITE / 'Makefile', self.root / 'Makefile')
        bin_dir = self.root / 'bin'
        bin_dir.mkdir()
        npm = bin_dir / 'npm'
        npm.write_text('#!/bin/sh\nprintf "%s|%s\\n" "$PWD" "$*" >> "$NPM_LOG"\nexit "${NPM_EXIT:-0}"\n')
        npm.chmod(0o755)
        self.log = self.root / 'npm.log'
        self.env = dict(os.environ, PATH=f'{bin_dir}:{os.environ["PATH"]}', NPM_LOG=str(self.log))

    def make(self, *args, **env):
        return subprocess.run(['make', '--no-print-directory', '-C', str(self.root), *args],
                              env={**self.env, **env}, text=True, capture_output=True, timeout=10)

    def test_help_and_default_are_safe(self):
        explicit = self.make('help')
        default = self.make()
        self.assertEqual(explicit.returncode, 0, explicit.stderr)
        self.assertEqual(default.returncode, 0, default.stderr)
        self.assertEqual(explicit.stdout, default.stdout)
        for term in ('Node.js', '20.9', 'npm', 'make install', 'make dev', 'make run',
                     'make build', 'make start', 'make test', 'make typecheck',
                     'http://localhost:3000', 'Ctrl+C', '.env.example', '.env.local', 'PORT='):
            self.assertIn(term, explicit.stdout)
        self.assertFalse(self.log.exists(), 'Help must not invoke npm')
        self.assertFalse((self.root / '.env.local').exists())

    def test_commands_and_failure_propagation(self):
        commands = {'install': 'ci', 'dev': 'run dev -- --port 3000',
                    'run': 'run dev -- --port 3000', 'build': 'run build',
                    'start': 'run start -- --port 3000', 'test': 'test', 'typecheck': 'run typecheck'}
        for target, expected in commands.items():
            with self.subTest(target=target):
                (self.root / target).touch()  # Targets must remain phony.
                result = self.make(target)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(self.log.read_text().splitlines()[-1], f'{self.root}|{expected}')
                failed = self.make(target, NPM_EXIT='17')
                self.assertNotEqual(failed.returncode, 0, target)
        for target in ('dev', 'run', 'start'):
            result = self.make(target, 'PORT=4321')
            self.assertEqual(result.returncode, 0, result.stderr)
            script = 'start' if target == 'start' else 'dev'
            self.assertEqual(self.log.read_text().splitlines()[-1], f'{self.root}|run {script} -- --port 4321')

    def test_live_development_server(self):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        # Install from the local lockfile if this is a clean check environment.
        if not (WEBSITE / 'node_modules/next').exists():
            subprocess.run(['npm', 'ci', '--no-audit', '--no-fund'], cwd=WEBSITE, check=True, timeout=90)
        with tempfile.TemporaryFile(mode='w+') as output:
            process = subprocess.Popen(['make', 'dev', f'PORT={port}'], cwd=WEBSITE,
                                       stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                deadline = time.monotonic() + 45
                while time.monotonic() < deadline:
                    try:
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}', timeout=3) as response:
                            html = response.read().decode()
                            self.assertEqual(response.status, 200)
                            self.assertIn('Gedson', html)
                            return
                    except (OSError, TimeoutError):
                        if process.poll() is not None:
                            break
                        time.sleep(.3)
                output.seek(0)
                self.fail('Development server did not serve homepage:\n' + output.read())
            finally:
                if process.poll() is None:
                    os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=5)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(MakefileTests)
    result = unittest.TestResult()
    suite.run(result)
    report = ET.Element('testsuite', name='makefile', tests=str(result.testsRun),
                        failures=str(len(result.failures)), errors=str(len(result.errors)), skipped='0')
    problems = {}
    for test, detail in result.failures + result.errors:
        parent_id = test.id().split(' (', 1)[0]
        problems[parent_id] = problems.get(parent_id, '') + detail
    for name in unittest.defaultTestLoader.getTestCaseNames(MakefileTests):
        case = ET.SubElement(report, 'testcase', classname='MakefileTests', name=name)
        if f'__main__.MakefileTests.{name}' in problems:
            ET.SubElement(case, 'failure').text = problems[f'__main__.MakefileTests.{name}']
    output = WEBSITE / 'test-results/makefile.xml'
    output.parent.mkdir(exist_ok=True)
    ET.ElementTree(report).write(output, encoding='unicode')
    for detail in problems.values():
        print(detail)
    print(f'{result.testsRun} Makefile tests; {len(problems)} failed')
    raise SystemExit(not result.wasSuccessful())
