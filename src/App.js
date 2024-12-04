import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [x, setX] = useState(2);
  const [y, setY] = useState(2);
  const [nodes, setNodes] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    const newNodes = [];
    for (let i = 0; i < x * y; i++) {
      newNodes.push({ id: i, text: `Node ${i}`, connections: [] });
    }
    setNodes(newNodes);
    document.documentElement.style.setProperty('--x', x);
    document.documentElement.style.setProperty('--y', y);
  }, [x, y]);

  const handleXChange = (e) => setX(Number(e.target.value));
  const handleYChange = (e) => setY(Number(e.target.value));

  const handleNodeClick = (node) => {
    if (selectedNodes.length === 0) {
      setSelectedNodes([node]);
    } else if (selectedNodes.length === 1) {
      setEdges([...edges, { from: selectedNodes[0], to: node }]);
      setSelectedNodes([]);
    }
  };

  return (
    <div className="App">
      <div className="sidebar sidebar-left">
        <p>Left Sidebar Item 1</p>
        <p>Left Sidebar Item 2</p>
      </div>

      <div className="main-content">
        <div className="graph-area">
          {nodes.map(node => (
            <div
              key={node.id}
              className={`graph-node ${selectedNodes.includes(node) ? 'selected' : ''}`}
              onClick={() => handleNodeClick(node)}
              style={{
                left: `${(node.id % x) * 100 / x + 50 / x}%`,
                top: `${Math.floor(node.id / x) * 100 / y + 50 / y}%`
              }}
            >
              {node.id}
            </div>
          ))}
          {edges.map((edge, index) => (
            <svg key={index} className="edge-line">
              <line
                x1={`${(edge.from.id % x) * 100 / x + 50 / x}%`}
                y1={`${Math.floor(edge.from.id / x) * 100 / y + 50 / y}%`}
                x2={`${(edge.to.id % x) * 100 / x + 50 / x}%`}
                y2={`${Math.floor(edge.to.id / x) * 100 / y + 50 / y}%`}
                stroke="black"
              />
            </svg>
          ))}
        </div>
      </div>

      <div className="sidebar sidebar-right">
        <p>Right Sidebar Item 1</p>
        <p>Right Sidebar Item 2</p>
        <div>
          <label>
            X:
            <input type="number" value={x} onChange={handleXChange} />
          </label>
        </div>
        <div>
          <label>
            Y:
            <input type="number" value={y} onChange={handleYChange} />
          </label>
        </div>
      </div>
    </div>
  );
}

export default App;