#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Statically compare course-profile OpenAPI with Java controllers.
Run: python3 scripts/check_contract.py. This does not replace runtime tests.
"""
from pathlib import Path
import re
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]
DOC = yaml.safe_load((ROOT / 'docs/week3/openapi.yaml').read_text())
ERRORS = []

def require(condition, message):
    if not condition:
        ERRORS.append(message)

def walk(value):
    if isinstance(value, dict):
        if '$ref' in value:
            pointer = value['$ref']
            require(pointer.startswith('#/'), f'External reference not checked: {pointer}')
            target = DOC
            try:
                for part in pointer[2:].split('/'):
                    target = target[part.replace('~1', '/').replace('~0', '~')]
            except (KeyError, TypeError):
                ERRORS.append(f'Unresolved reference: {pointer}')
        if value.get('type') == 'object':
            require(bool(value.get('properties') or value.get('allOf') or value.get('oneOf')), 'Unspecified object schema')
            require(set(value.get('required', [])) <= set(value.get('properties', {})), 'Required property missing from schema')
        for child in value.values():
            walk(child)
    elif isinstance(value, list):
        for child in value:
            walk(child)

walk(DOC)
METHODS = {'get', 'post', 'put', 'delete', 'patch', 'head', 'options'}
expected = {}
operation_ids = set()
for path, path_item in DOC['paths'].items():
    require(path.startswith('/'), f'Path must start with slash: {path}')
    for method, operation in path_item.items():
        if method not in METHODS:
            continue
        key = (method, path)
        expected[key] = operation
        op_id = operation.get('operationId')
        require(bool(op_id) and op_id not in operation_ids, f'Duplicate/missing operationId at {key}')
        operation_ids.add(op_id)
        parameters = path_item.get('parameters', []) + operation.get('parameters', [])
        declared = {p['name'] for p in parameters if p.get('in') == 'path'}
        require(declared == set(re.findall(r'{(\w+)}', path)), f'Path parameters mismatch at {key}')
        require(all(p.get('required') for p in parameters if p.get('in') == 'path'), f'Optional path parameter at {key}')
        require('200' in operation.get('responses', {}), f'No success response at {key}')

# Compare concrete POJO schemas with source fields (including inherited order fields).
pojo_sources = {p.stem: p for p in (ROOT / 'code/backend/sky-pojo/src/main/java/com/sky').rglob('*.java')}
def java_fields(class_name):
    source = pojo_sources[class_name].read_text()
    result = set(re.findall(r'private\s+(?!static)[\w<>]+\s+(\w+)\s*(?:=[^;]*)?;', source))
    parent = re.search(r'class\s+\w+\s+extends\s+(\w+)', source)
    if parent and parent.group(1) in pojo_sources:
        result.update(java_fields(parent.group(1)))
    if class_name == 'Employee':
        result.discard('password')  # @JsonIgnore is the actual outward serialization contract.
    return result
for name, schema in DOC['components']['schemas'].items():
    if name in pojo_sources:
        require(set(schema.get('properties', {})) == java_fields(name), f'POJO fields differ in schema {name}')

controller_dir = ROOT / 'code/backend/sky-server/src/main/java/com/sky/controller'
pojo_dir = ROOT / 'code/backend/sky-pojo/src/main/java/com/sky'
actual = {}

def clean(source):
    return re.sub(r'//[^\n]*|/\*.*?\*/', '', source, flags=re.S)

def mapping_path(annotation):
    match = re.search(r'"([^\"]*)"', annotation)
    return match.group(1) if match else ''

def split_parameters(text):
    text = re.sub(r'@[\w.]+(?:\([^)]*\))?', '', text)
    return [x.strip() for x in text.split(',') if x.strip()]

for source_file in sorted(controller_dir.rglob('*.java')):
    source = clean(source_file.read_text())
    header = source.split('public class', 1)[0]
    if re.search(r'@(?:[\w.]+\.)?Profile\("external"\)', header):
        continue
    base_match = re.search(r'@RequestMapping(?:\([^\n]*\))?', header)
    if not base_match:
        continue
    base = mapping_path(base_match.group())
    matcher = re.compile(r'@(Get|Post|Put|Delete|Patch)Mapping(?:\([^\n]*\))?\s*(?P<meta>(?:(?!public).)*?)public\s+[^\n{]+?\s+(?P<name>\w+)\s*\((?P<args>.*?)\)\s*(?:throws [^{]+)?\{', re.S)
    for match in matcher.finditer(source):
        method = match.group(1).lower()
        annotation = match.group().split('\n', 1)[0]
        path = '/' + '/'.join(x.strip('/') for x in (base, mapping_path(annotation)) if x.strip('/'))
        key = (method, path)
        args = match.group('args')
        actual[key] = str(source_file.relative_to(ROOT))
        if key not in expected:
            continue
        operation = expected[key]
        query_names = {p['name'] for p in operation.get('parameters', []) if p.get('in') == 'query'}
        java_queries = set()
        for argument in re.split(r',\s*(?=(?:@[\w.]|(?:Long|Integer|String|int|long)\s))', args):
            if '@RequestBody' in argument:
                require('requestBody' in operation, f'Java request body undocumented: {key}')
                continue
            if '@PathVariable' in argument:
                continue
            for part in split_parameters(argument):
                parsed = re.search(r'([\w<>]+)\s+(\w+)\s*$', part)
                if not parsed:
                    continue
                java_type, name = parsed.groups()
                dto_file = pojo_dir / 'dto' / (java_type + '.java')
                if dto_file.exists():
                    java_queries.update(re.findall(r'private\s+(?!static)\w+\s+(\w+)\s*;', dto_file.read_text()))
                else:
                    override = re.search(r'@RequestParam\(\s*(?:value\s*=\s*|name\s*=\s*)?"(\w+)"', argument)
                    java_queries.add(override.group(1) if override else name)
        require(java_queries == query_names, f'Query parameters {key}: Java={sorted(java_queries)} OpenAPI={sorted(query_names)}')

require(set(actual) == set(expected), 'Route mismatch: ' + str({'missing_in_openapi': sorted(set(actual)-set(expected)), 'missing_in_java': sorted(set(expected)-set(actual))}))
if ERRORS:
    print('\n'.join('ERROR: ' + message for message in ERRORS))
    sys.exit(1)
print(f'PASS: {len(actual)} Java HTTP operations match OpenAPI; {len(DOC["components"]["schemas"])} schemas; references, operation IDs, path/query parameters, POJO fields and bodies checked.')
print('Scope: static course-profile contracts only; runtime HTTP, SQL and business behavior require separate tests.')
