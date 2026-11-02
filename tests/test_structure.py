"""Permanent repository-layout acceptance checks; no third-party Python dependencies."""
import json
from pathlib import Path
import subprocess
import os
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
WEBSITE = ROOT / 'website'
APP_FILES = (
    'app/page.tsx', 'app/layout.tsx', 'app/globals.css', 'app/not-found.tsx',
    'app/blog/page.tsx', 'app/blog/[slug]/page.tsx', 'app/api/contact/route.ts',
    'components/ContactForm.tsx', 'components/Header.tsx', 'components/Footer.tsx',
    'components/PostCard.tsx', 'lib/posts.ts', 'package.json', 'tsconfig.json',
    'vitest.config.ts', '.env.example', 'tests/setup.ts',
    'tests/website.test.tsx', 'tests/browser.test.ts',
)


def run(*args, cwd=ROOT):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise AssertionError(result.stdout + result.stderr)
    return result.stdout


class StructureTests(unittest.TestCase):
    def test_contained(self):
        for name in APP_FILES:
            with self.subTest(path=name):
                self.assertTrue((WEBSITE / name).is_file(), name)
                self.assertTrue((WEBSITE / name).read_text().strip(), f'{name} must not be an empty placeholder')

    def test_no_duplicates(self):
        for name in ('app', 'components', 'lib', 'tsconfig.json', 'vitest.config.ts',
                     '.env.example', 'tests/website.test.tsx', 'tests/browser.test.ts'):
            with self.subTest(path=name):
                self.assertFalse((ROOT / name).exists(), name)

    def test_workspace(self):
        package = json.loads((ROOT / 'package.json').read_text())
        self.assertIn('website', package['workspaces'])
        self.assertNotIn('next', package.get('dependencies', {}))
        for command in ('dev', 'build', 'start', 'test', 'typecheck'):
            script = package['scripts'][command]
            self.assertRegex(script, rf'npm (?:--workspace website|--workspace=website|-w website) (?:run )?{command}\b')
        resolved = run('npm', 'exec', '--workspace', 'website', '--', 'node', '-p', 'process.cwd()')
        self.assertEqual(Path(resolved.strip()).resolve(), WEBSITE.resolve())
        lock = json.loads((ROOT / 'package-lock.json').read_text())
        self.assertEqual(lock['packages']['website']['name'], json.loads((WEBSITE / 'package.json').read_text())['name'])

    def test_command_routing(self):
        # Use real root scripts with instrumented child scripts, never modifying source.
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory)
            child = fixture / 'website'
            child.mkdir()
            (fixture / 'package.json').write_text((ROOT / 'package.json').read_text())
            package = json.loads((WEBSITE / 'package.json').read_text())
            package['scripts'] = {command: f'node spy.cjs {command}'
                                  for command in ('dev', 'build', 'start', 'test', 'typecheck')}
            (child / 'package.json').write_text(json.dumps(package))
            (child / 'spy.cjs').write_text(
                "require('fs').writeFileSync(process.env.ROUTE_LOG, JSON.stringify({"
                "cwd:process.cwd(),command:process.argv[2]}));"
                "process.exit(Number(process.env.ROUTE_EXIT));")
            log = fixture / 'route.json'
            for command in package['scripts']:
                for exit_code in (0, 37):
                    with self.subTest(command=command, exit_code=exit_code):
                        log.unlink(missing_ok=True)
                        result = subprocess.run(['npm', 'run', command], cwd=fixture,
                            env={**os.environ, 'ROUTE_LOG': str(log), 'ROUTE_EXIT': str(exit_code)},
                            capture_output=True, text=True, timeout=20)
                        self.assertTrue(log.exists(), result.stdout + result.stderr)
                        observed = json.loads(log.read_text())
                        self.assertEqual(Path(observed['cwd']).resolve(), child.resolve())
                        self.assertEqual(observed['command'], command)
                        self.assertEqual(result.returncode == 0, exit_code == 0,
                                         result.stdout + result.stderr)

    def test_relocated_suite(self):
        # Includes production build in website/, HTTP server, and desktop/mobile browser checks.
        output = run('npm', 'test')
        self.assertIn('41 passed', output)
        self.assertIn('browser.test.ts', output)

    def test_local_typecheck(self):
        run('npm', 'run', 'typecheck', cwd=WEBSITE)

    def test_root_typecheck(self):
        run('npm', 'run', 'typecheck')


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(StructureTests)
    result = unittest.TestResult()
    suite.run(result)
    report = ET.Element('testsuite', name='repository-structure', tests=str(result.testsRun),
                        failures=str(len(result.failures)), errors=str(len(result.errors)), skipped=str(len(result.skipped)))
    failed = {test.id(): message for test, message in result.failures + result.errors}
    for name in unittest.defaultTestLoader.getTestCaseNames(StructureTests):
        case = ET.SubElement(report, 'testcase', classname='StructureTests', name=name)
        key = f'__main__.StructureTests.{name}'
        messages = [message for test_id, message in failed.items()
                    if test_id == key or test_id.startswith(key + ' (')]
        if messages:
            ET.SubElement(case, 'failure').text = '\n'.join(messages)
    output = ROOT / 'test-results/structure.xml'
    output.parent.mkdir(exist_ok=True)
    ET.ElementTree(report).write(output, encoding='unicode')
    for test, message in result.failures + result.errors:
        print(test, message)
    print(f'{result.testsRun} structure tests; {len(failed)} failed')
    raise SystemExit(not result.wasSuccessful())
