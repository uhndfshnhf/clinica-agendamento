#!/usr/bin/env bash
set -euo pipefail
cd /workspace/clinica-agendamento
# Preserve package/artifact/TLS checks. The Node postinstall downloader does not
# honor the cloud HTTPS proxy; install its pinned CLI using curl and SHA-256.
npm ci --ignore-scripts --cache /workspace/.npm --no-audit --no-fund
mkdir -p .local node_modules/supabase/bin
supabase_version=$(node -p "require('./package.json').devDependencies.supabase")
supabase_dir=$(mktemp -d /tmp/quartier-supabase.XXXXXX)
curl -fsSL "https://github.com/supabase/cli/releases/download/v${supabase_version}/supabase_${supabase_version}_checksums.txt" -o "$supabase_dir/checksums.txt"
curl -fsSL "https://github.com/supabase/cli/releases/download/v${supabase_version}/supabase_linux_amd64.tar.gz" -o "$supabase_dir/supabase_linux_amd64.tar.gz"
python - "$supabase_dir" <<'PY'
import sys,pathlib,hashlib,tarfile
p=pathlib.Path(sys.argv[1]);name='supabase_linux_amd64.tar.gz'
expected=next(x.split()[0] for x in (p/'checksums.txt').read_text().splitlines() if x.endswith(name))
assert hashlib.sha256((p/name).read_bytes()).hexdigest()==expected,'Supabase checksum mismatch'
with tarfile.open(p/name) as t:pathlib.Path('node_modules/supabase/bin/supabase').write_bytes(t.extractfile('supabase').read())
pathlib.Path('node_modules/supabase/bin/supabase').chmod(0o755)
link=pathlib.Path('node_modules/.bin/supabase')
if not link.exists():link.symlink_to('../supabase/bin/supabase')
PY
if [ "$(docker info --format '{{.Driver}}')" = vfs ] && ! docker image inspect supabase/postgres:17.6.1.095 >/dev/null 2>&1; then
  crane_dir=$(mktemp -d /tmp/quartier-crane.XXXXXX)
  curl -fsSL https://github.com/google/go-containerregistry/releases/download/v0.20.3/checksums.txt -o "$crane_dir/checksums.txt"
  curl -fsSL https://github.com/google/go-containerregistry/releases/download/v0.20.3/go-containerregistry_Linux_x86_64.tar.gz -o "$crane_dir/crane.tar.gz"
  python - "$crane_dir" <<'PY'
import pathlib,hashlib,tarfile,sys
p=pathlib.Path(sys.argv[1]);name='go-containerregistry_Linux_x86_64.tar.gz'
expected=next(s.split()[0] for s in (p/'checksums.txt').read_text().splitlines() if s.endswith(name))
assert hashlib.sha256((p/'crane.tar.gz').read_bytes()).hexdigest()==expected,'Crane checksum mismatch'
with tarfile.open(p/'crane.tar.gz') as t:(p/'crane').write_bytes(t.extractfile('crane').read())
(p/'crane').chmod(0o755)
PY
  image_ref=registry-1.docker.io/supabase/postgres:17.6.1.095
  "$crane_dir/crane" digest "$image_ref" > .local/postgres-image-digest.txt
  pinned_ref="registry-1.docker.io/supabase/postgres@$(cat .local/postgres-image-digest.txt)"
  "$crane_dir/crane" config "$pinned_ref" > "$crane_dir/config.json"
  # crane verifies registry layer digests and merges layers without modifying files.
  "$crane_dir/crane" export "$pinned_ref" "$crane_dir/rootfs.tar"
  python - "$crane_dir" <<'PY'
import pathlib,sys,json,subprocess
p=pathlib.Path(sys.argv[1]);c=json.loads((p/'config.json').read_text())['config'];a=['docker','import']
for v in c.get('Env',[]):
 k,val=v.split('=',1);a+=['--change','ENV '+k+'='+json.dumps(val)]
for key in ['Entrypoint','Cmd']:
 if c.get(key):a+=['--change',key.upper()+' '+json.dumps(c[key])]
if c.get('WorkingDir'):a+=['--change','WORKDIR '+c['WorkingDir']]
a+=['--change','EXPOSE 5432',str(p/'rootfs.tar'),'supabase/postgres:17.6.1.095']
subprocess.run(a,check=True)
PY
fi
SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npm run db:start > .local/supabase-start.log 2>&1
npm run db:migrate
npm run local:env
npm run demo:seed
npm run functions:local
npm run build
