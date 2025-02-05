import React from 'react';
import * as go from 'gojs';
import './App.css';
import { LhsDiagramWrapper } from './lhsDiagram.tsx';

interface Node {
  id: number;
  text: string;
  connections: any[];
  value: number;
}

interface Edge {
  from: Node;
  to: Node;
}

interface AppState {
  nodeDataArray: Array<go.ObjectData>;
  linkDataArray: Array<go.ObjectData>;
  modelData: go.ObjectData;
  selectedKey: number | null;
  skipsDiagramUpdate: boolean;

  nodes: Node[];
  selectedNode: Node | null;
  edges: Edge[];
  selectedEdge: number | null;
}

const x = 20;
const y = 12;
const baseValue = 0;

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    const newNodes: Node[] = [];
    for (let i = 0; i < x * y; i++) {
      newNodes.push({ id: i, text: `Node ${i}`, connections: [], value: baseValue });
    }
    this.state = {
      nodeDataArray: [
        { key: 0, text: 'Alpha', color: 'lightblue', loc: '0 0' },
        { key: 1, text: 'Beta', color: 'orange', loc: '150 0' },
        { key: 2, text: 'Gamma', color: 'lightgreen', loc: '0 150' },
        { key: 3, text: 'Delta', color: 'pink', loc: '150 150' }
      ],
      linkDataArray: [
        { key: -1, from: 0, to: 1 },
        { key: -2, from: 0, to: 2 },
        { key: -3, from: 1, to: 1 },
        { key: -4, from: 2, to: 3 },
        { key: -5, from: 3, to: 0 }
      ],
      modelData: {
        canRelink: true
      },
      selectedKey: null,
      skipsDiagramUpdate: false,
      nodes: newNodes,
      selectedNode: null,
      edges: [],
      selectedEdge: null
    };
    this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleRelinkChange = this.handleRelinkChange.bind(this);
  }

  componentDidMount() {
    const newNodes: Node[] = [];
    for (let i = 0; i < x * y; i++) {
      newNodes.push({ id: i, text: `Node ${i}`, connections: [], value: baseValue });
    }
    this.setState({ nodes: newNodes });
  }

  handleDiagramEvent(e: go.DiagramEvent) {
    const name = e.name;
    switch (name) {
      case 'ChangedSelection': {
        const sel = e.subject.first();
        if (sel) {
          this.setState({ selectedKey: sel.key });
        } else {
          this.setState({ selectedKey: null });
        }
        break;
      }
      default: break;
    }
  }

  handleModelChange(e: go.IncrementalData) {
    // Handle model changes
  }

  handleRelinkChange(e: React.ChangeEvent<HTMLInputElement>) {
    const model = { ...this.state.modelData, canRelink: e.target.checked };
    this.setState({ modelData: model });
  }

  setSelectedNode(node: Node) {
    if (this.state.selectedNode === node) {
      this.setState({ selectedNode: null });
    } else {
      this.setState({ selectedNode: node });
    }
  }

  render() {
    let selKey;
    if (this.state.selectedKey !== null) {
      selKey = <p>Selected key: {this.state.selectedKey}</p>;
    }

    return (
      <div className="App">
        <div className="split-view">
          <div className="left-section">
            <div className="upper-part">
              {/* Upper part content */}
            </div>
            <div className="lower-part">
                <LhsDiagramWrapper
                  nodeDataArray={this.state.nodeDataArray}
                  linkDataArray={this.state.linkDataArray}
                  modelData={this.state.modelData}
                  skipsDiagramUpdate={this.state.skipsDiagramUpdate}
                  onDiagramEvent={this.handleDiagramEvent}
                  onModelChange={this.handleModelChange}
                />
            </div>
          </div>

          <div className="right-section">
            <div className="graph-area">
              {this.state.edges.map((edge, index) => (
                <svg key={index} className="edge-line">
                  <line
                    x1={`${(edge.from.id % x) * 100 / x + 50 / x}%`}
                    y1={`${(y - 1 - Math.floor(edge.from.id / x)) * 100 / y + 50 / y}%`}
                    x2={`${(edge.to.id % x) * 100 / x + 50 / x}%`}
                    y2={`${(y - 1 - Math.floor(edge.to.id / x)) * 100 / y + 50 / y}%`}
                    stroke={this.state.selectedEdge === index ? 'red' : 'black'}
                    strokeWidth={this.state.selectedEdge === index ? 2 : 1}
                  />
                </svg>
              ))}
              {this.state.nodes.map(node => (
                <div
                  key={node.id}
                  className="node-container"
                  style={{
                    left: `${(node.id % x) * 100 / x + 50 / x}%`,
                    top: `${(y - 1 - Math.floor(node.id / x)) * 100 / y + 50 / y}%`,
                  }}
                >
                  <div className="node-coordinates">
                    {`(${Math.floor(node.id / x)}, ${node.id % x})`}
                  </div>
                  <div
                    className={`graph-node ${this.state.selectedNode === node ? 'selected' : ''}`}
                    onClick={() => this.setSelectedNode(node)}
                  >
                    {node.value}
                  </div>
                </div>
              ))}
              {[...Array(x)].map((_, index) => (
                <div
                  key={index}
                  className="bottom-side-indicator"
                  style={{
                    width: `${100 / x}%`,
                    left: `${index * 100 / x}%`,
                  }}
                />
              ))}
              {[...Array(y)].map((_, index) => (
                <div
                  key={index}
                  className="left-side-indicator"
                  style={{
                    height: `${100 / y}%`,
                    bottom: `${index * 100 / y}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;