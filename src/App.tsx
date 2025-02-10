import React from 'react';
import { produce } from 'immer';
import * as go from 'gojs';
import './App.css';
import { LhsDiagramWrapper } from './lhsDiagram.tsx';

interface tableNode {
  id: number;
  text: string;
  connections: any[];
  value: number;
}

interface tableEdge {
  from: tableNode;
  to: tableNode;
}

interface dependencyNode {
  name: string;
  id: number;
}

interface sinkNode extends dependencyNode {
  tableId: number;
  to: tableNode;
}

interface variableNode extends dependencyNode {
  from: tableNode;
  to: tableNode;
}

interface dependencyEdge {
  from: tableNode;
  to: tableNode;
}

interface AppState {
  nodeDataArray: Array<go.ObjectData>;
  linkDataArray: Array<go.ObjectData>;
  modelData: go.ObjectData;
  selectedKey: number | null;
  skipsDiagramUpdate: boolean;
  currNodeKey: number;
  currEdgeKey: number;

  tableNodes: tableNode[];
  selectedTableNode: tableNode | null;
  sinkTableNode: tableNode | null;
  sourceTableNodes: tableNode[];
  tableEdges: tableEdge[];
}

const x = 12;
const y = 1;
const baseValue = 1;

//TYPE DEFINITIONS
const SINK = 0;
const SOURCE = 1;
const VARIABLE = 2;
const OPERATION = 3;

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    const newNodes: tableNode[] = [];
    for (let i = 0; i < x * y; i++) {
      newNodes.push({ id: i, text: `Node ${i}`, connections: [], value: baseValue });
    }
    this.state = {
      nodeDataArray: [
        { key: 0, text: 'Sink', tableId: -1, isGroup: true, type: SINK },
        { key: 1, nodeName: 'x', nodeValue: NaN, group: 0, type: VARIABLE, category: "immutable" },
        { key: 2, nodeName: 'y', nodeValue: NaN, group: 0, type: VARIABLE, category: "immutable" },
        { key: 3, nodeName: 'fib', nodeValue: NaN, group: 0, type: VARIABLE, category: "out" },
      ],
      linkDataArray: [
      ],
      modelData: {
        canRelink: true
      },
      selectedKey: null,
      skipsDiagramUpdate: false,
      currNodeKey: 3,
      currEdgeKey: 0,

      tableNodes: newNodes,
      selectedTableNode: null,
      sinkTableNode: null,
      sourceTableNodes: [],
      tableEdges: [],
    };
    this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleRelinkChange = this.handleRelinkChange.bind(this);

    this.handleSetSinkButton = this.handleSetSinkButton.bind(this);
    this.handleAddSourceButton = this.handleAddSourceButton.bind(this);
    this.handleDeleteButton = this.handleDeleteButton.bind(this);
    this.handleAdditionButton = this.handleAdditionButton.bind(this);
    this.handleSubtractionButton = this.handleSubtractionButton.bind(this);
    this.handleMultiplicationButton = this.handleMultiplicationButton.bind(this);
    this.handleDivisionButton = this.handleDivisionButton.bind(this);
    this.handleModuloButton = this.handleModuloButton.bind(this);
    this.handleMinimumButton = this.handleMinimumButton.bind(this);
    this.handleMaximumButton = this.handleMaximumButton.bind(this);
    this.handleButton11 = this.handleButton11.bind(this);
    this.handleButton12 = this.handleButton12.bind(this);
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
      case 'SelectionDeletingCustom': {
        this.handleDeleteButton();
        break;
      }
      case 'CustomLinkingRequest': {
        const node = e.subject.data;
        console.log('CustomLinkingRequest', node);
        break;
      }
      case 'CustomLinkingRelease': {
        const node = e.subject.data;
        console.log('CustomLinkingRelease', node);
        break
      }
      default: break;
    }
  }

  handleModelChange(e: go.IncrementalData) {
    console.log("uoooooh i'm changing");
    let updatedLinkDataArray = [...this.state.linkDataArray];

    e.insertedLinkKeys?.forEach((key) => {
      console.log("uoooooh i'm keying");
      const link = e.modifiedLinkData?.find((link) => link.key === key);
      if (link) {
        console.log("uoooooh i'm inserting");
        updatedLinkDataArray.push(link);
        console.log(updatedLinkDataArray);
      }
    });

    if (e.insertedLinkKeys) {
      this.setState({ 
        skipsDiagramUpdate: true,
        linkDataArray: updatedLinkDataArray
      });
    }

    if (e.modifiedNodeData) {
      return;
    }
    const updatedNodeDataArray = this.updateDependencyNodeValues(this.state.nodeDataArray, updatedLinkDataArray);
    this.setState({ 
      skipsDiagramUpdate: false,
      nodeDataArray: updatedNodeDataArray,
    });
  }

  topologicalSort(nodes: go.ObjectData[], edges: go.ObjectData[]): [number[], Map<number, number[]>] {
    const inDegrees = new Map<number, number>();
    const adjacencyList = new Map<number, number[]>();
    const reverseAdjacencyList = new Map<number, number[]>();


    nodes.forEach((node) => {
      const key = node.key as number;
      inDegrees.set(key, 0);
      adjacencyList.set(key, []);
      reverseAdjacencyList.set(key, []);
    });

    edges.forEach((edge) => {
      const from = edge.from as number;
      const to = edge.to as number;
      inDegrees.set(to, (inDegrees.get(to) || 0) + 1);
      adjacencyList.get(from)!.push(to);
      reverseAdjacencyList.get(to)!.push(from);
    });

    const queue: number[] = [];
    inDegrees.forEach((deg, key) => {
      if (deg === 0) {
        queue.push(key);
      }
    });

    const sorted: number[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      adjacencyList.get(current)?.forEach((neighbor) => {
        inDegrees.set(neighbor, (inDegrees.get(neighbor) || 0) - 1);
        if (inDegrees.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }

    if (sorted.length !== nodes.length) {
      throw new Error("Graph contains a cycle!");
    }

    return [sorted, reverseAdjacencyList];
  }

  updateDependencyNodeValues(nodeDataArray: go.ObjectData[], linkDataArray: go.ObjectData[]) {
    let updatedNodeDataArray = [...nodeDataArray];
    let updatedLinkDataArray = [...linkDataArray];

    const [orderedNodes, reverseAdjacencyList] = this.topologicalSort(
      updatedNodeDataArray,
      updatedLinkDataArray
    );

    console.log("Ordered nodes:", orderedNodes);
    console.log("Adjacency list:", reverseAdjacencyList);

    for (let i = 0; i < orderedNodes.length; i++) {
      updatedNodeDataArray = this.updateDependencyNodeFromDependencies(updatedNodeDataArray,
        orderedNodes[i], reverseAdjacencyList.get(orderedNodes[i]));
    }

    return updatedNodeDataArray;
  }

  updateTableNodeValues() {
    
  }

  handleRelinkChange(e: React.ChangeEvent<HTMLInputElement>) {
    const model = { ...this.state.modelData, canRelink: e.target.checked };
    this.setState({ modelData: model });
  }

  updateDependencyNodeFromDependencies(nodeDataArray: Array<go.ObjectData>, dKey: number, deps?: number[]) {
    let updatedNodeDataArray = [...nodeDataArray];
    const index = nodeDataArray.findIndex((node) => node.key === dKey);
    console.log('index:', index);
    if (index === -1) {
      return updatedNodeDataArray;
    }
    else if (deps && deps.length !== 0) {
      if (deps.length === 1) {
        const dep = nodeDataArray.find((node) => node.key === deps[0]);
        if (dep) {
          console.log('dep:', dep);
          updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: dep.nodeValue };
        }
      }
      else if (deps.length === 2) {
        const dep1 = nodeDataArray.find((node) => node.key === deps[0]);
        const dep2 = nodeDataArray.find((node) => node.key === deps[1]);
        if (dep1 && dep2) {
          console.log('dep1:', dep1);
          console.log('dep2:', dep2);
          let newValue = this.executeOperation(nodeDataArray[index].nodeName, dep1.nodeValue, dep2.nodeValue);
          updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: newValue };
        }
      }
    }
    else {
      if (nodeDataArray[index].parent) {
        updatedNodeDataArray = this.updateDependencyNodeFromTableNode(
          nodeDataArray, dKey, this.state.tableNodes[nodeDataArray[index].parent]);
      }
    }

    console.log('updated:', updatedNodeDataArray);
    return updatedNodeDataArray;
  }

  updateDependencyNodeFromTableNode(nodeDataArray: Array<go.ObjectData>, dKey: number, tNode?: tableNode) {
    let updatedNodeDataArray: Array<go.ObjectData>;

    if (tNode) {
      updatedNodeDataArray = nodeDataArray.map((node) => {
        if (node.key === dKey) {
          return { ...node, tableId: tNode.id };
        }
        else if (node.key === dKey + 1) {
          return { ...node, nodeValue: tNode.id % x };
        }
        else if (node.key === dKey + 2) {
          return { ...node, nodeValue: Math.floor(tNode.id / x) };
        }
        else if (node.key === dKey + 3) {
          return { ...node, nodeValue: tNode.value };
        }
        return node;
      });
    }
    else {
      updatedNodeDataArray = nodeDataArray.map((node) => {
        if (node.key === dKey) {
          return { ...node, tableId: -1 };
        }
        else if (node.key === dKey + 1) {
          return { ...node, nodeValue: NaN };
        }
        else if (node.key === dKey + 2) {
          return { ...node, nodeValue: NaN };
        }
        else if (node.key === dKey + 3) {
          return { ...node, nodeValue: NaN };
        }
        return node;
      });
    }

    return updatedNodeDataArray;
  }

  executeOperation(operation: string, a: number, b: number): number {
    if (isNaN(a) || isNaN(b)) {
      return NaN;
    }

    switch (operation) {
      case 'Addition':
        return a + b;
      case 'Subtraction':
        return a - b;
      case 'Multiplication':
        return a * b;
      case 'Division':
        return a / b;
      case 'Modulo':
        return a % b;
      case 'Minimum':
        return Math.min(a, b);
      case 'Maximum':
        return Math.max(a, b);
      default:
        return NaN;
    }
  }

  addDependencyNodes(newNodes: Array<go.ObjectData>): Array<go.ObjectData> {
    let updatedNodeDataArray = [...this.state.nodeDataArray];
    let newKey = this.state.currNodeKey + 1;
    for (let i = 0; i < newNodes.length; i++) {
      updatedNodeDataArray.push({ ...newNodes[i], key: newKey });
      console.log('key:', newKey);
      newKey++;
    }
    return updatedNodeDataArray;
  }

  handleSetSinkButton() {
    if (this.state.selectedTableNode === null ||
      this.state.selectedTableNode === this.state.sinkTableNode ||
      this.state.sourceTableNodes.some(source => source === this.state.selectedTableNode)) {
      /*
      const updatedNodeDataArray = this.updateDependencyNodeWithTableId(this.state.nodeDataArray, 0);
      this.setState({
        nodeDataArray: updatedNodeDataArray,
        sinkTableNode: null,
      });
      */
    }
    else if (this.state.sinkTableNode !== null) {
      const offset = this.state.selectedTableNode.id - this.state.sinkTableNode.id;

      for (let i = 0; i < this.state.sourceTableNodes.length; i++) {
        const targetIndex = this.state.sourceTableNodes[i].id + offset;
        if (targetIndex < 0 || targetIndex >= this.state.tableNodes.length) {
          console.warn("source.id + offset out of bounds:", targetIndex);
          return;
        }
      }

      let updatedNodeDataArray = this.state.nodeDataArray;
      this.state.nodeDataArray.forEach((node) => {
        if (node.tableId !== undefined) {
          updatedNodeDataArray = this.updateDependencyNodeFromTableNode(updatedNodeDataArray,
            node.key, this.state.tableNodes[node.tableId + offset]);
        }
      });
      let updatedSourceTableNodes = this.state.sourceTableNodes.map((source) => {
        return this.state.tableNodes[source.id + offset];
      });
      updatedNodeDataArray = this.updateDependencyNodeValues(updatedNodeDataArray, this.state.linkDataArray);
      this.setState({
        nodeDataArray: updatedNodeDataArray,
        sourceTableNodes: updatedSourceTableNodes,
        selectedTableNode: null,
        sinkTableNode: this.state.selectedTableNode
      });
    }
    else {
      let updatedNodeDataArray = this.updateDependencyNodeFromTableNode(this.state.nodeDataArray, 0, this.state.selectedTableNode);
      updatedNodeDataArray = this.updateDependencyNodeValues(updatedNodeDataArray, this.state.linkDataArray);
      this.setState({
        nodeDataArray: updatedNodeDataArray,
        selectedTableNode: null,
        sinkTableNode: this.state.selectedTableNode
      });
    }
  }

  handleAddSourceButton() {
    if (this.state.selectedTableNode === null ||
      this.state.selectedTableNode === this.state.sinkTableNode ||
      this.state.sourceTableNodes.some(source => source === this.state.selectedTableNode)) {

    }
    else {
      const newSource = this.state.selectedTableNode;
      const newKey = this.state.currNodeKey + 1;
      const updatedNodeDataArray = this.addDependencyNodes([
        { text: 'Source', tableId: newSource.id, isGroup: true, type: SOURCE },
        { nodeName: 'x', nodeValue: newSource.id % x, group: newKey, type: VARIABLE, category: "immutable" },
        { nodeName: 'y', nodeValue: Math.floor(newSource.id / x), group: newKey, type: VARIABLE, category: "immutable" },
        { nodeName: 'fib', nodeValue: newSource.value, group: newKey, type: VARIABLE, category: "immutable" },
      ]);

      this.setState({
        selectedTableNode: null,
        currNodeKey: this.state.currNodeKey + 4,
        nodeDataArray: updatedNodeDataArray,
        sourceTableNodes: [...this.state.sourceTableNodes, newSource]
      });
    }
  }

  handleDeleteButton() {
    if (this.state.selectedKey === null || this.state.selectedKey === 0) {
      return;
    }
    else {
      const targetNode = this.state.nodeDataArray.find(node => node.key === this.state.selectedKey);
      if (targetNode === undefined) {
        return;
      }

      const updatedNodeDataArray: Array<go.ObjectData> = this.state.nodeDataArray.filter(node => {
        if (node.key === this.state.selectedKey &&
          (node.type === SOURCE || node.type === OPERATION)) {
          return false;
        }
        if (node.group !== undefined && node.group === this.state.selectedKey) {
          return false;
        }
        return true;
      });

      let updatedSourceTableNodes: tableNode[] = [...this.state.sourceTableNodes];
      if (targetNode.type === SOURCE) {
        updatedSourceTableNodes = updatedSourceTableNodes.filter(source => source.id !== targetNode.tableId);
      }

      const updatedLinkDataArray: Array<go.ObjectData> = this.state.linkDataArray.filter(link =>
        link.from !== this.state.selectedKey && link.to !== this.state.selectedKey
      );

      this.setState({
        selectedKey: null,
        sourceTableNodes: updatedSourceTableNodes,
        nodeDataArray: updatedNodeDataArray,
        linkDataArray: updatedLinkDataArray
      });
    }
  }

  addOperation(operation: string) {
    const updatedNodeDataArray = this.addDependencyNodes([
      { nodeName: operation, nodeValue: NaN, type: OPERATION, category: "operation" },
    ]);
    this.setState({
      nodeDataArray: updatedNodeDataArray,
      currNodeKey: this.state.currNodeKey + 1
    });
  }

  handleAdditionButton() {
    this.addOperation('Addition');
  }

  handleSubtractionButton() {
    this.addOperation('Subtraction');
  }

  handleMultiplicationButton() {
    this.addOperation('Multiplication');
  }

  handleDivisionButton() {
    this.addOperation('Division');
  }

  handleModuloButton() {
    this.addOperation('Modulo');
  }

  handleMinimumButton() {
    this.addOperation('Minimum');
  }

  handleMaximumButton() {
    this.addOperation('Maximum');
  }

  handleButton11() {
    // Populate function body and rename as needed
  }

  handleButton12() {
    // Populate function body and rename as needed
  }

  setSelectedNode(node: tableNode) {
    if (this.state.selectedTableNode === node) {
      this.setState({ selectedTableNode: null });
    } else {
      this.setState({ selectedTableNode: node });
    }
  }

  render() {
    console.log(this.state.nodeDataArray);
    console.log(this.state.linkDataArray);
    let selKey;
    if (this.state.selectedKey !== null) {
      selKey = <p>Selected key: {this.state.selectedKey}</p>;
    }

    return (
      <div className="App">
        <div className="split-view">
          <div className="left-section">
            <div className="upper-part">
              {/* Added a dozen buttons */}
              <button onClick={this.handleSetSinkButton}>set Sink</button>
              <button onClick={this.handleAddSourceButton}>add Source</button>
              <button onClick={this.handleDeleteButton}>Delete</button>
              <button onClick={this.handleAdditionButton}>Addition</button>
              <button onClick={this.handleSubtractionButton}>Subtraction</button>
              <button onClick={this.handleMultiplicationButton}>Multiplication</button>
              <button onClick={this.handleDivisionButton}>Division</button>
              <button onClick={this.handleModuloButton}>Modulo</button>
              <button onClick={this.handleMinimumButton}>Minimum</button>
              <button onClick={this.handleMaximumButton}>Maximum</button>
              <button onClick={this.handleButton11}>Constant</button>
              <button onClick={this.handleButton12}>Button 12</button>
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
              {this.state.tableEdges.map((edge, index) => (
                <svg key={index} className="edge-line">
                  <line
                    x1={`${(edge.from.id % x) * 100 / x + 50 / x}%`}
                    y1={`${(y - 1 - Math.floor(edge.from.id / x)) * 100 / y + 50 / y}%`}
                    x2={`${(edge.to.id % x) * 100 / x + 50 / x}%`}
                    y2={`${(y - 1 - Math.floor(edge.to.id / x)) * 100 / y + 50 / y}%`}
                  />
                </svg>
              ))}
              {this.state.tableNodes.map(node => (
                <div
                  key={node.id}
                  className={`node-container 
                    ${this.state.selectedTableNode === node ? 'selected' : ''}
                    ${this.state.sinkTableNode === node ? 'sink' : ''}
                    ${this.state.sourceTableNodes.some(source => source === node) ? 'source' : ''}`}
                  style={{
                    left: `${(node.id % x) * 100 / x + 50 / x}%`,
                    top: `${(y - 1 - Math.floor(node.id / x)) * 100 / y + 50 / y}%`,
                  }}
                >
                  <div className="node-coordinates">
                    {`(${Math.floor(node.id / x)}, ${node.id % x})`}
                  </div>
                  <div
                    className="graph-node"
                    onClick={() => this.setSelectedNode(node)}
                  >
                    {node.value}
                  </div>
                </div>
              ))}
              {/*}
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
              */}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;