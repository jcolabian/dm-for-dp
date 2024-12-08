import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [x, setX] = useState(2);
  const [y, setY] = useState(2);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [edges, setEdges] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);

  useEffect(() => {
    const newNodes = [];
    for (let i = 0; i < x * y; i++) {
      newNodes.push({ id: i, text: `Node ${i}`, connections: [] });
    }
    setNodes(newNodes);
    document.documentElement.style.setProperty('--x', x);
    document.documentElement.style.setProperty('--y', y);
  }, [x, y]);

  const handleXChange = (e) => { 
    setX(Number(e.target.value));
    setSelectedNode(null);
  };
  const handleYChange = (e) => { 
    setY(Number(e.target.value));
    setSelectedNode(null);
  };

  function edgeExists (nodeFrom, nodeTo) {
    return edges.some(edge => edge.from.id === nodeFrom.id && edge.to.id === nodeTo.id)
  }

  const handleNodeClick = (node) => {
    if (selectedNode === null) {
      setSelectedNode(node);
    } else if (selectedNode.id === node.id) {
      setSelectedNode(null);
    } else {
if (!edgeExists(selectedNode, node)) {
      setEdges([...edges, { from: selectedNode, to: node }]);
}      
      setSelectedNode(null);
    }
  };

  const handleEdgeClick = (index) => {
    setSelectedEdge(index);
  };

  return (
    <div className="App">
      <div className="sidebar sidebar-left">
        <p>Left Sidebar Item 1</p>
        <p>Left Sidebar Item 2</p>
        <div className="edge-list">
          {edges.map((edge, index) => (
            <p
              key={index}
              className={selectedEdge === index ? 'selected-edge' : ''}
              onClick={() => handleEdgeClick(index)}
            >
              {`(${edge.from.id}) - (${edge.to.id})`}
            </p>
          ))}
        </div>
      </div>

      <div className="main-content">
        <div className="graph-area">
          {edges.map((edge, index) => (
            <svg key={index} className="edge-line">
              <line
                x1={`${(edge.from.id % x) * 100 / x + 50 / x}%`}
                y1={`${Math.floor(edge.from.id / x) * 100 / y + 50 / y}%`}
                x2={`${(edge.to.id % x) * 100 / x + 50 / x}%`}
                y2={`${Math.floor(edge.to.id / x) * 100 / y + 50 / y}%`}
                stroke={selectedEdge === index ? 'red' : 'black'}
                strokeWidth={selectedEdge === index ? 2 : 1}
              />
            </svg>
          ))}
          {nodes.map(node => (
            <div
              key={node.id}
              className="node-container"
              style={{
                left: `${(node.id % x) * 100 / x + 50 / x}%`,
                top: `${Math.floor(node.id / x) * 100 / y + 50 / y}%`,
              }}
            >
              <div className="node-coordinates">
                {`(${node.id % x}, ${Math.floor(node.id / x)})`}
              </div>
              <div
                className={`graph-node ${selectedNode === node ? 'selected' : ''}`}
                onClick={() => handleNodeClick(node)}
              >
                {node.id}
              </div>
            </div>
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