"""Verify this website works with no repository-level npm installation.
Run from any directory: python3 website/tests/test_isolation.py
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET

WEBSITE = Path(__file__).resolve().parents[1]
ROOT = WEBSITE.parent


class IsolationTests(unittest.TestCase):
    def test_layout(self):
        for name in ('package.json', 'package-lock.json', 'tests', 'tsconfig.tsbuildinfo', 'node_modules', '.next', 'next-env.d.ts', 'test-results'):
            self.assertFalse((ROOT / name).exists(), f'Website leftover at root: {name}')
        package = json.loads((WEBSITE / 'package.json').read_text())
        lock = json.loads((WEBSITE / 'package-lock.json').read_text())
        self.assertNotIn('workspaces', package)
        self.assertNotIn('workspaces', lock['packages'][''])
        self.assertEqual(package['name'], lock['name'])
        for group in ('dependencies', 'devDependencies'):
            self.assertEqual(package[group], lock['packages'][''][group])
            for value in package[group].values():
                self.assertFalse(value.startswith(('file:', 'link:', 'workspace:')))
        self.assertFalse(any(value.get('link') for value in lock['packages'].values()))

    def test_portable_install_and_execution(self):
        with tempfile.TemporaryDirectory(prefix='standalone-website-') as temp:
            app = Path(temp) / 'website'
            shutil.copytree(WEBSITE, app, ignore=shutil.ignore_patterns(
                'node_modules', '.next', 'test-results', '*.tsbuildinfo',
                'next-env.d.ts', '.env.local', '__pycache__'))
            env = {**os.environ, 'NEXT_TELEMETRY_DISABLED': '1'}
            env.pop('NODE_PATH', None)

            def run(*args):
                result = subprocess.run(args, cwd=app, env=env, text=True,
                                        capture_output=True, timeout=180)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                return result

            run('npm', 'ci', '--no-audit', '--no-fund')
            self.assertTrue((app / 'node_modules/next/package.json').is_file())
            run('npm', 'test')
            report = ET.parse(app / 'test-results/website.xml').getroot()
            cases = report.findall('.//testcase')
            self.assertGreaterEqual(len(cases), 41)
            self.assertFalse(report.findall('.//failure') + report.findall('.//error') + report.findall('.//skipped'))
            self.assertTrue(any('home-browser' in case.get('name', '') for case in cases))
            self.assertTrue((app / '.next/BUILD_ID').is_file())
            run('npm', 'run', 'typecheck')
            (app / 'app/isolation-invalid.ts').write_text('export const broken: number = "not a number";\n')
            result = subprocess.run(['npm', 'run', 'typecheck'], cwd=app, env=env,
                                    text=True, capture_output=True, timeout=60)
            self.assertNotEqual(result.returncode, 0, 'Typecheck must reject invalid source')
            self.assertIn('isolation-invalid.ts', result.stdout + result.stderr)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(IsolationTests)
    result = unittest.TestResult()
    suite.run(result)
    report = ET.Element('testsuite', name='website-isolation', tests=str(result.testsRun),
                        failures=str(len(result.failures)), errors=str(len(result.errors)), skipped=str(len(result.skipped)))
    failures = {test.id(): detail for test, detail in result.failures + result.errors}
    for name in unittest.defaultTestLoader.getTestCaseNames(IsolationTests):
        case = ET.SubElement(report, 'testcase', classname='IsolationTests', name=name)
        key = f'__main__.IsolationTests.{name}'
        if key in failures:
            ET.SubElement(case, 'failure').text = failures[key]
    output = WEBSITE / 'test-results/isolation.xml'
    output.parent.mkdir(exist_ok=True)
    ET.ElementTree(report).write(output, encoding='unicode')
    for test, detail in result.failures + result.errors:
        print(test, detail)
    print(f'{result.testsRun} isolation tests; {len(failures)} failed')
    raise SystemExit(not result.wasSuccessful())
