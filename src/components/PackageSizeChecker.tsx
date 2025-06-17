import { useState, useRef, useEffect } from "react";
import { WebContainer } from "@webcontainer/api";

const PackageSizeChecker: React.FC = () => {
  const [packageName, setPackageName] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isContainerReady, setIsContainerReady] = useState<boolean>(false);

  const containerRef = useRef<any>(null);

  useEffect(() => {
    const bootContainer = async () => {
      containerRef.current = await WebContainer.boot();

      await containerRef.current.mount({
        'package.json': {
          file: {
            contents: JSON.stringify({
              name: 'package-size-checker',
              type: 'module',
              dependencies: {},
            }, null, 2),
          },
        },
      });

      setIsContainerReady(true);
    };

    bootContainer();
  }, []);

  const runCommand = async (cmd: string, args: string[]) => {
    const process = await containerRef.current.spawn(cmd, args);
    const reader = process.output.getReader();
    let result = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }

    return result;
  };

  const handleCheckSize = async () => {
    if (!packageName.trim()) return;

    if (!isContainerReady || !containerRef.current) {
      alert("🛑 Container is still booting up. Please wait a few seconds and try again.");
      return;
    }

    setLoading(true);
    setOutput('');

    const pkg = packageName.trim();
    const pkgJson = {
      name: 'package-size-checker',
      type: 'module',
      dependencies: {
        [pkg]: 'latest',
      },
    };

    await containerRef.current.fs.writeFile('/package.json', JSON.stringify(pkgJson, null, 2));
    const installLog = await runCommand('npm', ['install']);
    const sizeLog = await runCommand('du', ['-sh', `node_modules/${pkg.split('/').pop()}`]);

    setOutput(`📦 Installing ${pkg}...\n${installLog}\n\n📏 Package Size:\n${sizeLog}`);
    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '40px auto',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '10px',
        fontFamily: 'sans-serif',
      }}
    >
      <h2 style={{ marginBottom: '1rem' }}>📦 NPM Package Size Finder</h2>

      <input
        type="text"
        placeholder="Enter package name (e.g. react, express)"
        value={packageName}
        onChange={(e) => setPackageName(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '10px',
        }}
      />

      <button
        onClick={handleCheckSize}
        disabled={loading || !isContainerReady}
        style={{
          padding: '10px 20px',
          cursor: loading || !isContainerReady ? 'not-allowed' : 'pointer',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
        }}
      >
        {loading ? 'Checking...' : isContainerReady ? 'Check Size' : 'Loading Container...'}
      </button>

      <pre
        style={{
          whiteSpace: 'pre-wrap',
          marginTop: '20px',
          background: '#f9f9f9',
          padding: '10px',
          height: '300px',
          overflow: 'auto',
        }}
      >
        {output}
      </pre>
    </div>
  );
};

export default PackageSizeChecker;
