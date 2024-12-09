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
  const [condition, setCondition] = useState('none');
  const [operation, setOperation] = useState('none');
  const [opValue, setOpValue] = useState('0');


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
  const handleBaseChange = (e) => {
    setBase(Number(e.target.value));
    forceUpdate();
  };

  function edgeExists(nodeFrom, nodeTo) {
    return edges.some(edge => edge.from.id === nodeFrom.id && edge.to.id === nodeTo.id)
  }

  const handleNodeClick = (node) => {
    if (selectedNode === null) {
      setSelectedNode(node);
    } else if (selectedNode.id === node.id) {
      setSelectedNode(null);
    } else {
      if (!edgeExists(selectedNode, node)) {
        handleAddEdge(selectedNode, node);
      }
      setSelectedNode(null);
    }
  };

  const handleEdgeClick = (index) => {
    if (selectedEdge === index) {
      setSelectedEdge(null);
    } else {
      setSelectedEdge(index);
    }
  };

  const handleAddEdge = (fromNode, toNode) => {
    const newEdge = { from: fromNode, to: toNode, condition: 'none', operation: 'none', opValue: '0' };
    setEdges([...edges, newEdge]);
  };

  const handleEditRelation = () => {
    if (selectedEdge !== null) {
      const newEdges = edges.map((edge, index) => {
        if (index === selectedEdge) {
          edge.condition = condition;
          edge.operation = operation;
          edge.opValue = opValue;
        }
        return edge;
      });
      setEdges(newEdges);
    }
    forceUpdate();
  };

  const handleDeleteEdge = () => {
    if (selectedEdge !== null) {
      setEdges(edges.filter((_, index) => index !== selectedEdge));
      setSelectedEdge(null);
    }
  };

  const handleConditionChange = (e) => {
    setCondition(String(e.target.value));
  };
  const handleOperationChange = (e) => {
    setOperation(String(e.target.value));
  };
  const handleOpValueChange = (e) => {
    setOpValue(String(e.target.value));
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
        <button onClick={() => handleEditRelation()}>Edit Relation</button>
        <button onClick={() => handleDeleteEdge()}>Remove</button>
        <div>
          <label>
            Condition:
            <select value={condition} onChange={handleConditionChange} >
              <option value="none">none</option>
              <option value="<">&lt;</option>
              <option value="<=">&lt;=</option>
              <option value="==">==</option>
              <option value=">=">&gt;=</option>
              <option value=">">&gt;</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Operation:
            <select value={operation} onChange={handleOperationChange} >
              <option value="none">none</option>
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="*">*</option>
              <option value="/">/</option>
            </select>
          </label>
          <div>
            <label>
              Value:
              <input type="string" value={opValue} onChange={handleOpValueChange} />
            </label>
          </div>
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
                {node.value}
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
        <div>
          <label>
            Base value:
            <input type="number" step="1" onChange={handleBaseChange} />
          </label>
        </div>
      </div>
    </div>
  );
}

export default App;