import React, { useState, useEffect, useReducer } from 'react';
import './App.css';

function App() {
  const [x, setX] = useState(2);
  const [y, setY] = useState(2);
  const [baseValue, setBase] = useState(0);
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [edges, setEdges] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);

  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const newNodes = [];
    for (let i = 0; i < x * y; i++) {
      newNodes.push({ id: i, text: `Node ${i}`, connections: [], value: baseValue });
    }
    setNodes(newNodes);
    document.documentElement.style.setProperty('--x', x);
    document.documentElement.style.setProperty('--y', y);
  }, [baseValue, x, y]);

  const handleXChange = (e) => {
    setX(Number(e.target.value));
    setSelectedNode(null);
  };
  const handleYChange = (e) => {
    setY(Number(e.target.value));
    setSelectedNode(null);
  };

  const handleEdgeClick = (index) => {
    if (selectedEdge === index) {
      setSelectedEdge(null);
    } else {
      setSelectedEdge(index);
    }
    forceUpdate();
  };

  const handleDeleteEdge = () => {
    if (selectedEdge !== null) {
      setEdges(edges.filter((_, index) => index !== selectedEdge));
      setSelectedEdge(null);
    }
  };

  return (
    <div className="App">
      <div className="split-view">
        <div className="left-section">
          <div className="upper-part">
            {/* Upper part content */}
          </div>
          <div className="lower-part">
            {/* Lower part content */}
          </div>
        </div>

        <div className="right-section">
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
                  onClick={() => setSelectedNode(node)}
                >
                  {node.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;