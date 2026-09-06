import os
import json

SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build', '.next', 'out'}

def detect_tech_stack(repo_path: str, file_list: list):
    """
    Accurately detect tech stack using file presence, content analysis,
    and config file parsing across the entire repository tree.
    """
    stack = {}

    def read_file(rel_path):
        try:
            full_path = os.path.join(repo_path, rel_path)
            if os.path.isfile(full_path):
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
        except Exception:
            pass
        return ""

    def find_all_files(basename_lower):
        """Find all files matching a specific basename across the entire repo"""
        matches = []
        for f in file_list:
            if os.path.basename(f).lower() == basename_lower.lower():
                matches.append(f)
        return matches

    
    py_files = [f for f in file_list if f.endswith('.py')]
    if py_files:
        stack['Python'] = {'icon': '🐍', 'confidence': 'high', 'files': []}

        
        py_configs = []
        for match in find_all_files('requirements.txt') + find_all_files('pyproject.toml') + find_all_files('setup.py') + find_all_files('Pipfile'):
            py_configs.append(read_file(match))
        combined_py = "\n".join(py_configs).lower()

        if 'fastapi' in combined_py:
            stack['FastAPI'] = {'icon': '⚡', 'confidence': 'high', 'files': []}
        if 'django' in combined_py:
            stack['Django'] = {'icon': '🎸', 'confidence': 'high', 'files': []}
        if 'flask' in combined_py:
            stack['Flask'] = {'icon': '🌶️', 'confidence': 'high', 'files': []}
        if 'sqlalchemy' in combined_py or 'alembic' in combined_py:
            stack['SQLAlchemy'] = {'icon': '🗄️', 'confidence': 'high', 'files': []}
        if 'pytest' in combined_py:
            stack['Pytest'] = {'icon': '🧪', 'confidence': 'high', 'files': []}
        if 'pydantic' in combined_py:
            stack['Pydantic'] = {'icon': '✅', 'confidence': 'high', 'files': []}
        if 'celery' in combined_py:
            stack['Celery'] = {'icon': '🌿', 'confidence': 'high', 'files': []}
        if 'uvicorn' in combined_py or 'gunicorn' in combined_py:
            stack['ASGI/WSGI'] = {'icon': '🚀', 'confidence': 'high', 'files': []}
        if 'torch' in combined_py or 'tensorflow' in combined_py or 'keras' in combined_py:
            stack['ML/DL'] = {'icon': '🤖', 'confidence': 'high', 'files': []}
        if 'pandas' in combined_py or 'numpy' in combined_py:
            stack['Data Science'] = {'icon': '📊', 'confidence': 'high', 'files': []}

    pkg_files = find_all_files('package.json')
    js_or_ts_files = [f for f in file_list if f.endswith(('.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'))]

    if pkg_files or js_or_ts_files:
        stack['Node.js'] = {'icon': '🟢', 'confidence': 'high' if pkg_files else 'medium', 'files': pkg_files}

        all_deps = {}
        for pkg_rel in pkg_files:
            content = read_file(pkg_rel)
            if content:
                try:
                    pkg_data = json.loads(content)
                    deps = {**pkg_data.get('dependencies', {}), **pkg_data.get('devDependencies', {})}
                    for k, v in deps.items():
                        all_deps[k.lower()] = v
                except Exception:
                    pass

        if 'react' in all_deps or any(f.endswith(('.jsx', '.tsx')) for f in file_list):
            stack['React'] = {'icon': '⚛️', 'confidence': 'high', 'files': []}
        if 'next' in all_deps or any('next.config' in f.lower() for f in file_list):
            stack['Next.js'] = {'icon': '▲', 'confidence': 'high', 'files': []}
        if 'vue' in all_deps or any(f.endswith('.vue') for f in file_list):
            stack['Vue.js'] = {'icon': '💚', 'confidence': 'high', 'files': []}
        if 'svelte' in all_deps or any(f.endswith('.svelte') for f in file_list):
            stack['Svelte'] = {'icon': '🔥', 'confidence': 'high', 'files': []}
        if '@angular/core' in all_deps:
            stack['Angular'] = {'icon': '🔴', 'confidence': 'high', 'files': []}
        if 'vite' in all_deps or any('vite.config' in f.lower() for f in file_list):
            stack['Vite'] = {'icon': '⚡', 'confidence': 'high', 'files': []}
        if 'express' in all_deps:
            stack['Express.js'] = {'icon': '🚂', 'confidence': 'high', 'files': []}
        if 'fastify' in all_deps:
            stack['Fastify'] = {'icon': '🚀', 'confidence': 'high', 'files': []}
        if 'nestjs' in all_deps or '@nestjs/core' in all_deps:
            stack['NestJS'] = {'icon': '🐈', 'confidence': 'high', 'files': []}
        if 'typescript' in all_deps or any(f.endswith(('.ts', '.tsx')) for f in file_list):
            stack['TypeScript'] = {'icon': '🔷', 'confidence': 'high', 'files': []}
        if 'tailwindcss' in all_deps or any('tailwind.config' in f.lower() for f in file_list):
            stack['Tailwind CSS'] = {'icon': '🎨', 'confidence': 'high', 'files': []}
        if 'prisma' in all_deps or any('schema.prisma' in f.lower() for f in file_list):
            stack['Prisma'] = {'icon': '💎', 'confidence': 'high', 'files': []}
        if 'mongoose' in all_deps or 'mongodb' in all_deps:
            stack['MongoDB'] = {'icon': '🍃', 'confidence': 'high', 'files': []}
        if 'sequelize' in all_deps:
            stack['Sequelize'] = {'icon': '🗄️', 'confidence': 'high', 'files': []}
        if 'jest' in all_deps or '@jest/core' in all_deps:
            stack['Jest'] = {'icon': '🧪', 'confidence': 'high', 'files': []}

    java_files = [f for f in file_list if f.endswith('.java')]
    pom_files = find_all_files('pom.xml')
    gradle_files = find_all_files('build.gradle') + find_all_files('build.gradle.kts')

    if java_files or pom_files or gradle_files:
        stack['Java'] = {'icon': '☕', 'confidence': 'high', 'files': []}
        combined_java = ""
        for p in pom_files + gradle_files:
            combined_java += "\n" + read_file(p).lower()

        if 'spring-boot' in combined_java or 'springframework' in combined_java:
            stack['Spring Boot'] = {'icon': '🌱', 'confidence': 'high', 'files': []}
        if 'hibernate' in combined_java:
            stack['Hibernate'] = {'icon': '🗄️', 'confidence': 'high', 'files': []}
        if pom_files:
            stack['Maven'] = {'icon': '📦', 'confidence': 'high', 'files': []}
        if gradle_files:
            stack['Gradle'] = {'icon': '🐘', 'confidence': 'high', 'files': []}

   
    go_files = [f for f in file_list if f.endswith('.go')]
    go_mod_files = find_all_files('go.mod')
    if go_files or go_mod_files:
        stack['Go'] = {'icon': '🐹', 'confidence': 'high', 'files': []}
        combined_go = "".join([read_file(g) for g in go_mod_files]).lower()
        if 'gin-gonic' in combined_go:
            stack['Gin'] = {'icon': '🍸', 'confidence': 'high', 'files': []}
        if 'fiber' in combined_go:
            stack['Fiber'] = {'icon': '⚡', 'confidence': 'high', 'files': []}

   
    cargo_files = find_all_files('Cargo.toml')
    if cargo_files or any(f.endswith('.rs') for f in file_list):
        stack['Rust'] = {'icon': '🦀', 'confidence': 'high', 'files': []}

    rb_files = [f for f in file_list if f.endswith('.rb')]
    gem_files = find_all_files('Gemfile')
    if rb_files or gem_files:
        stack['Ruby'] = {'icon': '💎', 'confidence': 'high', 'files': []}
        combined_gem = "".join([read_file(g) for g in gem_files]).lower()
        if 'rails' in combined_gem:
            stack['Ruby on Rails'] = {'icon': '🛤️', 'confidence': 'high', 'files': []}

    php_files = [f for f in file_list if f.endswith('.php')]
    composer_files = find_all_files('composer.json')
    if php_files or composer_files:
        stack['PHP'] = {'icon': '🐘', 'confidence': 'high', 'files': []}
        combined_composer = "".join([read_file(c) for c in composer_files]).lower()
        if 'laravel' in combined_composer:
            stack['Laravel'] = {'icon': '🔴', 'confidence': 'high', 'files': []}
        if 'symfony' in combined_composer:
            stack['Symfony'] = {'icon': '🎵', 'confidence': 'high', 'files': []}

    all_content_lower = ""
    for fname in ['docker-compose.yml', 'docker-compose.yaml', '.env.example', 'README.md', 'compose.yaml']:
        for matched in find_all_files(fname):
            all_content_lower += "\n" + read_file(matched).lower()

    if 'postgres' in all_content_lower or 'postgresql' in all_content_lower or 'psycopg2' in all_content_lower:
        stack['PostgreSQL'] = {'icon': '🐘', 'confidence': 'medium', 'files': []}
    if 'mysql' in all_content_lower or 'pymysql' in all_content_lower:
        stack['MySQL'] = {'icon': '🐬', 'confidence': 'medium', 'files': []}
    if 'redis' in all_content_lower:
        stack['Redis'] = {'icon': '🔴', 'confidence': 'medium', 'files': []}
    if 'mongodb' in all_content_lower or 'mongo' in all_content_lower:
        stack.setdefault('MongoDB', {'icon': '🍃', 'confidence': 'medium', 'files': []})
    if 'sqlite' in all_content_lower or any(f.endswith('.sqlite') or f.endswith('.sqlite3') or f.endswith('.db') for f in file_list):
        stack['SQLite'] = {'icon': '🗃️', 'confidence': 'medium', 'files': []}

    if find_all_files('Dockerfile') or any(os.path.basename(f).lower() == 'dockerfile' for f in file_list):
        stack['Docker'] = {'icon': '🐳', 'confidence': 'high', 'files': []}
    if any('docker-compose' in f.lower() or 'compose.yaml' in f.lower() for f in file_list):
        stack['Docker Compose'] = {'icon': '🐙', 'confidence': 'high', 'files': []}
    if any('.github/workflows' in f.replace('\\', '/') for f in file_list):
        stack['GitHub Actions'] = {'icon': '⚙️', 'confidence': 'high', 'files': []}
    if any('k8s' in f.lower() or 'kubernetes' in f.lower() for f in file_list):
        stack['Kubernetes'] = {'icon': '☸️', 'confidence': 'medium', 'files': []}

    return [
        {"name": name, "icon": info["icon"], "confidence": info["confidence"]}
        for name, info in stack.items()
    ]