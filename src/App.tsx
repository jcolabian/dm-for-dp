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
  locked: boolean;
}

interface tableEdge {
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
  selectedTableNode: number | undefined;
  sinkTableNode: number | undefined;
  sourceTableNodes: number[];
  tableEdges: tableEdge[];

  lockDialogOpen: boolean;
  lockDialogNode: tableNode | null;
  dialogValue: number;
  lockDialogLock: boolean;

  constDialogOpen: boolean;

  x: number;
  y: number;
  vals: number;

  lhsStep: number;
  rhsStep: number;
}

const x = 12;
const y = 1;
const vals = 1;

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
      newNodes.push({ id: i, text: `Node ${i}`, connections: [], value: NaN, locked: false });
    }
    this.state = {
      nodeDataArray: [
        { key: 0, text: 'Sink', tableId: -1, isGroup: true, type: SINK },
        { key: 1, nodeName: 'x', nodeValue: NaN, group: 0, type: VARIABLE, category: "immutable" },
        { key: 2, nodeName: 'y', nodeValue: NaN, group: 0, type: VARIABLE, category: "immutable" },
        { key: 3, nodeName: 'val1', nodeValue: NaN, group: 0, type: VARIABLE, category: "out" },
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
      selectedTableNode: undefined,
      sinkTableNode: undefined,
      sourceTableNodes: [],
      tableEdges: [],

      lockDialogOpen: false,
      lockDialogNode: null,
      dialogValue: 0,
      lockDialogLock: false,

      constDialogOpen: false,

      x: x,
      y: y,
      vals: vals,

      lhsStep: 4,
      rhsStep: newNodes.length
    };
    this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleRelinkChange = this.handleRelinkChange.bind(this);

    this.handleSetSinkButton = this.handleSetSinkButton.bind(this);
    this.handleAddSourceButton = this.handleAddSourceButton.bind(this);
    this.handleDeleteButton = this.handleDeleteButton.bind(this);
    this.handleConstantButton = this.handleConstantButton.bind(this);
    this.handleConditionalButton = this.handleConditionalButton.bind(this);
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
        //        console.log('CustomLinkingRequest', node);
        break;
      }
      case 'CustomLinkingRelease': {
        const node = e.subject.data;
        //        console.log('CustomLinkingRelease', node);
        break
      }
      default: break;
    }
  }

  handleModelChange(e: go.IncrementalData) {
    if (false) { return; }

    console.log("uoooooh i'm changing");
    let updatedLinkDataArray = [...this.state.linkDataArray];
    let currEdgeKey = this.state.currEdgeKey;


    e.insertedLinkKeys?.forEach((key) => {
      //      console.log("uoooooh i'm keying");
      const link = e.modifiedLinkData?.find((link) => link.key === key);
      if (link && link.key < this.state.currEdgeKey) {
        //        console.log("uoooooh i'm inserting");
        //this.state.linkDataArray.filter((lA) => link.from === lA.from && link.to === lA.to);
        updatedLinkDataArray.push(link);
        currEdgeKey = Math.min(currEdgeKey, link.key);
        //        console.log(updatedLinkDataArray);
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
    const [updatedNodeDataArray, updatedTableNodes, updatedSourceTableNodes] =
      this.updateDependencyNodeValues(
        this.state.nodeDataArray,
        updatedLinkDataArray,
        this.state.tableNodes,
        this.state.x,
        this.state.y,
        this.state.sinkTableNode
      );
    this.setState({
      skipsDiagramUpdate: false,
      sourceTableNodes: updatedSourceTableNodes,
      tableNodes: updatedTableNodes,
      nodeDataArray: updatedNodeDataArray,
    });

  }

  topologicalSort(nodes: go.ObjectData[], edges: go.ObjectData[]): [number[], Map<number, go.ObjectData[]>] {
    const inDegrees = new Map<number, number>();
    const adjacencyList = new Map<number, number[]>();
    const reverseAdjacencyList = new Map<number, go.ObjectData[]>();


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
      reverseAdjacencyList.get(to)!.push(edge);
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

  updateDependencyNodeValues(
    nodeDataArray: go.ObjectData[],
    linkDataArray: go.ObjectData[],
    tableNodes: tableNode[],
    x: number, y: number, sink?: number,
    lhsStep?: number, rhsStep?: number
  ): [go.ObjectData[], tableNode[], number[]] 
  {
    let dummyArray = [...nodeDataArray];
    let updatedNodeDataArray = [...nodeDataArray];
    let updatedLinkDataArray = [...linkDataArray];
    //let updatedTableNodes = [...tableNodes]
    let updatedTableNodes = tableNodes.map(node => ({ ...node, value: NaN }));

    if (sink === undefined) {
      sink = 0;
    }
    if (lhsStep === undefined) {
      lhsStep = this.state.lhsStep;
    }
    if (rhsStep === undefined) {
      rhsStep = this.state.rhsStep;
    }


    const [orderedNodes, reverseAdjacencyList] = this.topologicalSort(
      dummyArray,
      updatedLinkDataArray
    );

    //    console.log("Ordered nodes:", orderedNodes);
    //    console.log("Adjacency list:", reverseAdjacencyList);
    //    console.log("ref sink:", this.state.sinkTableNode);
    //    console.log("sink:", sink);

    //updatedTableNodes[0].value = 1;

    for (let i = 0; i < updatedTableNodes.length; i++) {
      if (tableNodes[i].locked) {
        updatedTableNodes[i].value = tableNodes[i].value;
        console.log('locked:', i);
        //        console.log('value:', updatedTableNodes[i].value);
        continue;
      }

      let offset = i - sink;

      for (let j = 0; j < orderedNodes.length; j++) {
        dummyArray = this.updateDependencyNodeFromDependencies(dummyArray, updatedTableNodes,
          orderedNodes[j], offset, true, x, y, sink, reverseAdjacencyList.get(orderedNodes[j]));
      }
      //if (true) continue;

      let updatedSinkNode = dummyArray.find((node) => node.key === 3);
      if (updatedSinkNode) {
        if(i < rhsStep) {
          updatedTableNodes[i].value = updatedSinkNode.nodeValue;
        }
        else {
          updatedTableNodes[i].value = NaN;
        }

        console.log('i:', i);
        //        console.log('offset:', offset);
        //        console.log('value:', updatedSinkNode.nodeValue);
      }
      else {
        console.log('sorry:', i);
      }

      if (offset === 0) {
        updatedNodeDataArray = [...dummyArray];
      }
    }

    for (let j = 0; j < orderedNodes.length; j++) {
      dummyArray = this.updateDependencyNodeFromDependencies(dummyArray, updatedTableNodes,
        orderedNodes[j], 0, j<lhsStep, x, y, sink, reverseAdjacencyList.get(orderedNodes[j]));
    }
    updatedNodeDataArray = [...dummyArray];

    let updatedSourceTableNodes: number[] = [];
    for (let i = 0; i < updatedNodeDataArray.length; i++) {
      if (updatedNodeDataArray[i].type === SOURCE) {
        updatedSourceTableNodes.push(updatedNodeDataArray[i].tableId);
      }
    }

    return [updatedNodeDataArray, updatedTableNodes, updatedSourceTableNodes];
  }

  updateTableNodeValues() {

  }

  handleRelinkChange(e: React.ChangeEvent<HTMLInputElement>) {
    const model = { ...this.state.modelData, canRelink: e.target.checked };
    this.setState({ modelData: model });
  }

  updateDependencyNodeFromDependencies(
    nodeDataArray: Array<go.ObjectData>,
    tableNodes: tableNode[],
    dKey: number, offset: number,
    valid: boolean,
    x: number, y: number,
    sink: number, deps?: go.ObjectData[])
    {
    let updatedNodeDataArray = [...nodeDataArray];
    const index = nodeDataArray.findIndex((node) => node.key === dKey);

    //    console.log('index:', index);
    if (index === -1) {
      return updatedNodeDataArray;
    }
    else if (valid === false) {
      updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: NaN };
    }
    else if (updatedNodeDataArray[index].category === "immutable") {
      if (nodeDataArray[index].group !== undefined) {
        if (deps && deps.length === 2) {
          let leftDep = nodeDataArray.find((node) => node.key === deps[0].from);
          let rightDep = nodeDataArray.find((node) => node.key === deps[1].from);
          let parentId = nodeDataArray.findIndex((node) => node.key === nodeDataArray[index].group);
          if (leftDep && rightDep) {
            if (deps[0].toPort === "rightPort" && deps[1].toPort === "leftPort") {
              [leftDep, rightDep] = [rightDep, leftDep];
            }

            let newValueIndex = leftDep.nodeValue + x * rightDep.nodeValue;

            if (newValueIndex >= 0 && newValueIndex < tableNodes.length) {
              updatedNodeDataArray[parentId] = {
                ...updatedNodeDataArray[parentId],
                tableId: newValueIndex
              };
              updatedNodeDataArray[index] = {
                ...updatedNodeDataArray[index],
                nodeValue: tableNodes[newValueIndex].value
              };
            } else {
              updatedNodeDataArray[index] = {
                ...updatedNodeDataArray[index],
                nodeValue: NaN
              };
            }
          }
        }
        else {
          if (updatedNodeDataArray[index].nodeName === "x") {
            updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: (sink + offset) % x };
          }
          else if (updatedNodeDataArray[index].nodeName === "y") {
            updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: Math.floor((sink + offset) / x) };
          }
        }
        /*
        const parent = nodeDataArray.find((node) => node.key === nodeDataArray[index].group);
        if (parent && 0 <= parent.tableId + offset && parent.tableId + offset < tableNodes.length) {
          updatedNodeDataArray = this.updateDependencyNodeFromTableNode(
            nodeDataArray, parent.key, tableNodes[parent.tableId]);
        }
        else {
          updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: NaN }
        }
        */
      }
    }
    else if (updatedNodeDataArray[index].category === "out" || updatedNodeDataArray[index].category === "mutable") {
      if (deps && deps.length === 1) {
        const dep = nodeDataArray.find((node) => node.key === deps[0].from);
        if (dep) {
          //          console.log('out/mutable - dep:', dep.value);
          if (updatedNodeDataArray[index].nodeName === "Not") {
            updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: (dep.nodeValue === 0) ? 1 : 0 };
          }
          else {
            updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: dep.nodeValue };
          }
        }
      }
      else {
        if (updatedNodeDataArray[index].nodeName === "x") {
          const sinkX = sink % x;
          const sinkY = Math.floor(sink / x);
          const parent = nodeDataArray.find((node) => node.key === nodeDataArray[index].group);
          const newX = (sinkX + sinkY * x + parent.tableOffset + offset) % x;
          console.log('x - prev:', updatedNodeDataArray[index].nodeValue, ' newX:', newX);
          updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: newX };
        }
        else if (updatedNodeDataArray[index].nodeName === "y") {
          const sinkX = sink % x;
          const sinkY = Math.floor(sink / x);
          const parent = nodeDataArray.find((node) => node.key === nodeDataArray[index].group);
          const newY = Math.floor((sinkX + sinkY * x + parent.tableOffset + offset) / x)
          console.log('y - prev:', updatedNodeDataArray[index].nodeValue, ' newY:', newY);
          updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: newY };
        }
      }
    }
    else if (updatedNodeDataArray[index].category === "operation") {
      if (deps && deps.length === 2) {
        let leftDep = nodeDataArray.find((node) => node.key === deps[0].from);
        let rightDep = nodeDataArray.find((node) => node.key === deps[1].from);
        if (leftDep && rightDep) {
          if (deps[0].toPort === "rightPort" && deps[1].toPort === "leftPort") {
            [leftDep, rightDep] = [rightDep, leftDep];
          }
          let newValue = this.executeOperation(nodeDataArray[index].nodeName, leftDep.nodeValue, rightDep.nodeValue);
          //          console.log('operation - ', 'left:', leftDep, ' right:', rightDep, ' newValue:', newValue);
          updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: newValue };
        }
      }
      else {
        updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: NaN };
      }
    }
    else if (updatedNodeDataArray[index].category === "conditional") {
      if (deps && deps.length === 3) {
        let ifDep = nodeDataArray.find((node) => node.key === deps[0].from);
        let thenDep = nodeDataArray.find((node) => node.key === deps[1].from);
        let elseDep = nodeDataArray.find((node) => node.key === deps[2].from);

        if (deps[1].toPort === "topPort") {
          [ifDep, thenDep] = [thenDep, ifDep];
          if (deps[0].toPort === "rightPort") {
            [thenDep, elseDep] = [elseDep, thenDep];
          }
        }
        else if (deps[2].toPort === "topPort") {
          [ifDep, elseDep] = [elseDep, ifDep];
          if (deps[0].toPort === "leftPort") {
            [thenDep, elseDep] = [elseDep, thenDep];
          }
        }

        if (ifDep) {

          let newValue = (ifDep.nodeValue !== 0) ? ((thenDep) ? thenDep.nodeValue : NaN) : ((elseDep) ? elseDep.nodeValue : NaN);
          console.log('conditional - ', 'if:', ifDep, ' then:', thenDep, ' else:', elseDep, ' newValue:', newValue);
          updatedNodeDataArray[index] = { ...updatedNodeDataArray[index], nodeValue: newValue };
        }
      }
    }

    //    console.log(updatedNodeDataArray[index].category)
    //    console.log('updated:', updatedNodeDataArray);
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
          return { ...node, nodeValue: tNode.id % this.state.x };
        }
        else if (node.key === dKey + 2) {
          return { ...node, nodeValue: Math.floor(tNode.id / this.state.x) };
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
      case 'Or':
        return (a === 0 && b === 0) ? 0 : 1;
      case 'And':
        return (a !== 0 && b !== 0) ? 1 : 0;
      case 'Equal':
        return (a === b) ? 1 : 0;
      case 'Smaller':
        return (a < b) ? 1 : 0;
      default:
        return NaN;
    }
  }

  addDependencyNodes(newNodes: Array<go.ObjectData>): [Array<go.ObjectData>, number[]] {
    let updatedNodeDataArray = [...this.state.nodeDataArray];
    let newKey = this.state.currNodeKey + 1;
    let keys: number[] = [];
    for (let i = 0; i < newNodes.length; i++) {
      updatedNodeDataArray.push({ ...newNodes[i], key: newKey });
      //      console.log('key:', newKey);
      keys.push(newKey);
      newKey++;
    }
    return [updatedNodeDataArray, keys];
  }

  addDependencyEdges(newEdges: Array<go.ObjectData>): [Array<go.ObjectData>, number[]] {
    let updatedLinkDataArray = [...this.state.linkDataArray];
    let newKey = this.state.currEdgeKey - 1;
    let keys: number[] = [];
    for (let i = 0; i < newEdges.length; i++) {
      updatedLinkDataArray.push({ ...newEdges[i], key: newKey });
      keys.push(newKey);
      newKey--;
    }
    return [updatedLinkDataArray, keys];
  }

  handleSetSinkButton() {
    if (this.state.selectedTableNode === undefined ||
      this.state.selectedTableNode === this.state.sinkTableNode) {
      /*
      const updatedNodeDataArray = this.updateDependencyNodeWithTableId(this.state.nodeDataArray, 0);
      this.setState({
        nodeDataArray: updatedNodeDataArray,
        sinkTableNode: null,
      });
      */
    }
    else if (this.state.sinkTableNode !== undefined) {
      const offset = this.state.selectedTableNode - this.state.sinkTableNode;

      for (let i = 0; i < this.state.sourceTableNodes.length; i++) {
        const targetIndex = this.state.sourceTableNodes[i] + offset;
        if (targetIndex < 0 || targetIndex >= this.state.tableNodes.length) {
          console.warn("source.id + offset out of bounds:", targetIndex);
          return;
        }
      }

      let updatedNodeDataArray = this.state.nodeDataArray;
      let updatedTableNodes = this.state.tableNodes;
      this.state.nodeDataArray.forEach((node) => {
        if (node.tableId !== undefined) {
          updatedNodeDataArray = this.updateDependencyNodeFromTableNode(
            updatedNodeDataArray,
            node.key,
            this.state.tableNodes[node.tableId + offset]
          );
        }
      });
      let updatedSourceTableNodes: number[] = [];
      [updatedNodeDataArray, updatedTableNodes, updatedSourceTableNodes] = this.updateDependencyNodeValues(
        updatedNodeDataArray,
        this.state.linkDataArray,
        updatedTableNodes,
        this.state.x,
        this.state.y,
        this.state.selectedTableNode
      );
      this.setState({
        tableNodes: updatedTableNodes,
        nodeDataArray: updatedNodeDataArray,
        sourceTableNodes: updatedSourceTableNodes,
        selectedTableNode: undefined,
        sinkTableNode: this.state.selectedTableNode
      });
    }
    else {
      let updatedNodeDataArray = this.updateDependencyNodeFromTableNode(this.state.nodeDataArray, 0,
        this.state.tableNodes[this.state.selectedTableNode]);

      updatedNodeDataArray.forEach((node) => {
        if (node.tableOffset !== undefined) {
          node.tableOffset = node.tableId - this.state.selectedTableNode;
        }
      });

      let updatedTableNodes = this.state.tableNodes;
      let updatedSourceTableNodes = this.state.sourceTableNodes;
      [updatedNodeDataArray, updatedTableNodes, updatedSourceTableNodes] = this.updateDependencyNodeValues(
        updatedNodeDataArray,
        this.state.linkDataArray,
        updatedTableNodes,
        this.state.x,
        this.state.y,
        this.state.selectedTableNode
      );
      this.setState({
        tableNodes: updatedTableNodes,
        nodeDataArray: updatedNodeDataArray,
        sourceTableNodes: updatedSourceTableNodes,
        selectedTableNode: undefined,
        sinkTableNode: this.state.selectedTableNode
      });
    }
  }

  handleAddSourceButton() {
    if (this.state.selectedTableNode === undefined ||
      this.state.selectedTableNode === this.state.sinkTableNode ||
      this.state.sourceTableNodes.some(source => source === this.state.selectedTableNode)) {

    }
    else {
      const newSource = this.state.selectedTableNode;
      const newKey = this.state.currNodeKey + 1;
      const off = newSource - ((this.state.sinkTableNode === undefined) ? 0 : this.state.sinkTableNode);
      const [updatedNodeDataArray, newKeys] = this.addDependencyNodes([
        { text: 'Source', tableId: newSource, tableOffset: off, isGroup: true, type: SOURCE },
        { nodeName: 'x', nodeValue: newSource % this.state.x, group: newKey, type: VARIABLE, category: "mutable" },
        { nodeName: 'y', nodeValue: Math.floor(newSource / this.state.x), group: newKey, type: VARIABLE, category: "mutable" },
        { nodeName: 'val1', nodeValue: this.state.tableNodes[newSource].value, group: newKey, type: VARIABLE, category: "immutable" },
      ]);

      const [updatedLinkDataArray, _] = this.addDependencyEdges([
        { from: newKeys[1], to: newKeys[3], fromPort: "bottomPort", toPort: "leftPort", category: "hidden" },
        { from: newKeys[2], to: newKeys[3], fromPort: "bottomPort", toPort: "rightPort", category: "hidden" },
      ]);

      this.setState({
        selectedTableNode: undefined,
        currNodeKey: this.state.currNodeKey + 4,
        currEdgeKey: this.state.currEdgeKey - 2,
        nodeDataArray: updatedNodeDataArray,
        linkDataArray: updatedLinkDataArray,
        sourceTableNodes: [...this.state.sourceTableNodes, newSource],
        lhsStep: this.state.lhsStep + 4,
      });
    }
  }

  handleDeleteButton() {
    if (this.state.selectedKey === null || this.state.selectedKey === 0) {
      return;
    }
    else if (this.state.selectedKey < 0) {
      const updatedLinkDataArray: Array<go.ObjectData> = this.state.linkDataArray.filter(link =>
        link.key !== this.state.selectedKey
      );
      this.setState({
        selectedKey: null,
        linkDataArray: updatedLinkDataArray
      });

    }
    else {
      const targetNode = this.state.nodeDataArray.find(node => node.key === this.state.selectedKey);
      if (targetNode === undefined || targetNode.group !== undefined) {
        return;
      }

      let removed: number[] = [];
      const updatedNodeDataArray: Array<go.ObjectData> = this.state.nodeDataArray.filter(node => {
        if (node.key === this.state.selectedKey) {
          removed.push(node.key);
          return false;
        }
        if (node.group !== undefined && node.group === this.state.selectedKey) {
          removed.push(node.key);
          return false;
        }
        return true;
      });

      let updatedSourceTableNodes: number[] = [...this.state.sourceTableNodes];
      if (targetNode.type === SOURCE) {
        updatedSourceTableNodes = updatedSourceTableNodes.filter(source => source !== targetNode.tableId);
      }

      const updatedLinkDataArray: Array<go.ObjectData> = this.state.linkDataArray.filter(link =>
        removed.includes(link.from) === false && removed.includes(link.to) === false
      );

      this.setState({
        selectedKey: null,
        sourceTableNodes: updatedSourceTableNodes,
        nodeDataArray: updatedNodeDataArray,
        linkDataArray: updatedLinkDataArray,
        lhsStep: this.state.lhsStep - removed.length,
      });
    }
  }

  addOperation(operation: string) {
    const [updatedNodeDataArray, newKeys] = this.addDependencyNodes([
      { nodeName: operation, nodeValue: NaN, type: OPERATION, category: "operation" },
    ]);
    this.setState({
      nodeDataArray: updatedNodeDataArray,
      currNodeKey: this.state.currNodeKey + 1,
      lhsStep: this.state.lhsStep + 1,
    });
  }

  addNotOperation() {
    const [updatedNodeDataArray, newKeys] = this.addDependencyNodes([
      { nodeName: "Not", nodeValue: NaN, type: OPERATION, category: "mutable" },
    ]);
    this.setState({
      nodeDataArray: updatedNodeDataArray,
      currNodeKey: this.state.currNodeKey + 1,
      lhsStep: this.state.lhsStep + 1,
    });
  }

  handleConstantButton() {
    this.setState({
      constDialogOpen: true,
      lockDialogOpen: false,
      lockDialogNode: null,
    });
  }

  addConstant(value: number) {
    const [updatedNodeDataArray, newKeys] = this.addDependencyNodes([
      { nodeName: 'const', nodeValue: value, type: VARIABLE, category: "immutable" },
    ]);
    this.setState({
      nodeDataArray: updatedNodeDataArray,
      currNodeKey: this.state.currNodeKey + 1,
      constDialogOpen: false,
      lhsStep: this.state.lhsStep + 1,
    });
  }

  handleConditionalButton() {
    const [updatedNodeDataArray, newKeys] = this.addDependencyNodes([
      { nodeName: "if", nodeValue: NaN, type: OPERATION, category: "conditional" },
    ]);
    this.setState({
      nodeDataArray: updatedNodeDataArray,
      currNodeKey: this.state.currNodeKey + 1,
      lhsStep: this.state.lhsStep + 1,
    });
  }

  setSelectedNode(node: tableNode) {
    if (this.state.selectedTableNode === node.id) {
      this.setState({ selectedTableNode: undefined });
    } else {
      this.setState({ selectedTableNode: node.id });
    }
  }

  openDialog(node: tableNode): void {
    if (node === this.state.lockDialogNode) {
      this.setState({
        lockDialogOpen: false,
        lockDialogNode: null,
        dialogValue: 0,
        lockDialogLock: false,
      });
      return;
    }
    this.setState({
      lockDialogOpen: true,
      lockDialogNode: node,
      dialogValue: node.value,
      lockDialogLock: true,
    });
    //    console.log('lockDialogNode:', this.state.lockDialogNode);
  };

  manualUpdate = () => {
    this.setState(
      produce((draft: AppState) => {
        if (draft.lockDialogNode) {
          const id = draft.lockDialogNode.id;
          draft.tableNodes[id].value = draft.dialogValue;
          draft.tableNodes[id].locked = draft.lockDialogLock;
        }

        let updatedNodeDataArray: go.ObjectData[] = [];
        let updatedTableNodes: tableNode[] = [];
        let updatedSourceTableNodes: number[] = [];

        [updatedNodeDataArray, updatedTableNodes, updatedSourceTableNodes] =
          this.updateDependencyNodeValues(
            draft.nodeDataArray,
            draft.linkDataArray,
            draft.tableNodes,
            draft.x,
            draft.y,
            draft.sinkTableNode
          );
        draft.nodeDataArray = updatedNodeDataArray;
        draft.tableNodes = updatedTableNodes;
        draft.sourceTableNodes = updatedSourceTableNodes;
        draft.lockDialogOpen = false;
        draft.lockDialogNode = null;
      })
    );
  };

  updateTableLengthY(nY: number) {
    this.setState(
      produce((draft: AppState) => {
        if (
          draft.sinkTableNode !== undefined &&
          (draft.x * nY < draft.sinkTableNode ||
            draft.sourceTableNodes.some(source => draft.x * nY < source))
        ) {
          console.warn("Table size is too small for the current sink/source nodes");
          return;
        }

        let updatedTableNodes: tableNode[] = [];
        for (let i = 0; i < draft.x * nY; i++) {
          if (i < draft.tableNodes.length) {
            updatedTableNodes.push(draft.tableNodes[i]);
          } else {
            updatedTableNodes.push({ id: i, text: `Node ${i}`, connections: [], value: 0, locked: false });
          }
        }


        let updatedNodeDataArray: go.ObjectData[] = [];
        let updatedSourceTableNodes: number[] = [];

        [updatedNodeDataArray, updatedTableNodes, updatedSourceTableNodes] =
          this.updateDependencyNodeValues(
            draft.nodeDataArray,
            draft.linkDataArray,
            updatedTableNodes,
            draft.x,
            nY,
            draft.sinkTableNode
          );
        draft.nodeDataArray = updatedNodeDataArray;
        draft.tableNodes = updatedTableNodes;
        draft.sourceTableNodes = updatedSourceTableNodes;
        draft.selectedTableNode = undefined;
        draft.rhsStep = (draft.rhsStep == draft.x * draft.y) ? draft.x * nY : Math.min(draft.rhsStep, draft.x * nY);
        draft.y = nY;
      })
    );
  }

  updateTableLengthX(nX: number) {
    this.setState(
      produce((draft: AppState) => {
        if (
          draft.sinkTableNode !== undefined &&
          (nX <= draft.sinkTableNode % draft.x ||
            draft.sourceTableNodes.some(source => nX <= source % draft.x))
        ) {
          console.warn("Table size is too small for the current sink/source nodes");
          return;
        }

        let updatedTableNodes: tableNode[] = [];
        for (let i = 0; i < nX * draft.y; i++) {
          if (i % nX < draft.x) {
            let currNode = draft.tableNodes[i % nX + Math.floor(i / nX) * draft.x];
            updatedTableNodes.push({
              id: i,
              text: `Node ${i}`,
              connections: [],
              value: currNode.value,
              locked: currNode.locked,
            });
          } else {
            updatedTableNodes.push({
              id: i,
              text: `Node ${i}`,
              connections: [],
              value: 0,
              locked: false,
            });
          }
        }

        let updatedSinkTableNode =
          (draft.sinkTableNode === undefined)
            ? undefined
            : draft.nodeDataArray[1].nodeValue + draft.nodeDataArray[2].nodeValue * nX;

        let updatedNodeDataArray: Array<go.ObjectData> = [];
        for (let i = 0; i < draft.nodeDataArray.length; i++) {
          if (draft.nodeDataArray[i].tableId !== undefined) {
            const oldX = draft.nodeDataArray[i + 1].nodeValue;
            const oldY = draft.nodeDataArray[i + 2].nodeValue;

            if (i === 0) {
              updatedNodeDataArray.push({
                ...draft.nodeDataArray[i],
                tableId: oldX + oldY * nX,
              });
              console.log("sink:", oldX + oldY * nX);
            } else {
              const oldOffset = draft.nodeDataArray[i].tableOffset;
              updatedNodeDataArray.push({
                ...draft.nodeDataArray[i],
                tableId: oldX + oldY * nX,
                tableOffset: oldOffset -
                  (Math.floor((updatedSinkTableNode ?? 0) / nX) - oldY)
                  * ((nX < draft.x) ? -1 : 1),
              });
              console.log("source:", oldX + oldY * nX);
              console.log("offset:", oldOffset - Math.floor((updatedSinkTableNode ?? 0) / nX) + oldY);
            }
          } else {
            updatedNodeDataArray.push(draft.nodeDataArray[i]);
          }
        }

        let updatedSourceTableNodes: number[] = draft.sourceTableNodes;
        [updatedNodeDataArray, updatedTableNodes, updatedSourceTableNodes] =
          this.updateDependencyNodeValues(
            updatedNodeDataArray,
            draft.linkDataArray,
            updatedTableNodes,
            nX,
            draft.y,
            updatedSinkTableNode
          );

        draft.nodeDataArray = updatedNodeDataArray;
        draft.tableNodes = updatedTableNodes;
        draft.sourceTableNodes = updatedSourceTableNodes;
        draft.sinkTableNode = updatedSinkTableNode;
        draft.selectedTableNode = undefined;
        draft.rhsStep = (draft.rhsStep == draft.x * draft.y) ? nX * draft.y : Math.min(draft.rhsStep, nX * draft.y);
        draft.x = nX;
      })
    );
  }

  updateStep(lhs: number, rhs: number) {
    this.setState(
      produce((draft: AppState) => {
        draft.lhsStep = lhs;
        draft.rhsStep = rhs;

        const [updatedNodeDataArray, updatedTableNodes, updatedSourceTableNodes] =
          this.updateDependencyNodeValues(
            draft.nodeDataArray,
            draft.linkDataArray,
            draft.tableNodes,
            draft.x,
            draft.y,
            draft.sinkTableNode,
            lhs,
            rhs
          );
        draft.nodeDataArray = updatedNodeDataArray;
        draft.tableNodes = updatedTableNodes;
        draft.sourceTableNodes = updatedSourceTableNodes;
      })
    );
  }

  render() {
    console.log('nodeDataArray', this.state.nodeDataArray);
    console.log('linkDataArray', this.state.linkDataArray);
    console.log('tableNodes', this.state.tableNodes);

    /*
    let selKey;
    if (this.state.selectedKey !== null) {
      selKey = <p>Selected key: {this.state.selectedKey}</p>;
    }
    */

    return (
      <div className="App">
        <div className="split-view">
          <div className="left-section">
            <div className="upper-part">
              <button onClick={this.handleSetSinkButton}>set Sink</button>
              <button onClick={this.handleAddSourceButton}>add Source</button>
              <button onClick={this.handleConstantButton}>Constant</button>
              <button onClick={this.handleDeleteButton}>Delete</button>
              <br />
              <button onClick={() => this.addOperation('Addition')}>Addition</button>
              <button onClick={() => this.addOperation('Subtraction')}>Subtraction</button>
              <button onClick={() => this.addOperation('Multiplication')}>Multiplication</button>
              <button onClick={() => this.addOperation('Division')}>Division</button>
              <button onClick={() => this.addOperation('Modulo')}>Modulo</button>
              <button onClick={() => this.addOperation('Minimum')}>Minimum</button>
              <button onClick={() => this.addOperation('Maximum')}>Maximum</button>
              <br />
              <button onClick={this.handleConditionalButton}>Condition</button>
              <button onClick={() => this.addOperation('Or')}>Or</button>
              <button onClick={() => this.addOperation('And')}>And</button>
              <button onClick={() => this.addOperation('Not')}>Not</button>
              <button onClick={() => this.addOperation('Equal')}>Equal</button>
              <button onClick={() => this.addOperation('Smaller')}>Smaller</button>
              <br />
              <label>
                x:
                <input
                  type="number"
                  value={this.state.x}
                  onChange={(e) =>
                    this.updateTableLengthX(Number(e.target.value))
                  }
                />
              </label>
              <label style={{ marginLeft: "7rem" }}>
                y:
                <input
                  type="number"
                  value={this.state.y}
                  onChange={(e) =>
                    this.updateTableLengthY(Number(e.target.value))
                  }
                />
              </label>
              {/*
              <label>
                vals:
                <input
                  type="number"
                  value={this.state.vals}
                  onChange={(e) =>
                    this.setState({ vals: Number(e.target.value) })
                  }
                />
              </label>
              */}
              <br />
              <label>
                LHS:&nbsp;
                <input
                  type="range"
                  min="1"
                  max={this.state.nodeDataArray.length}
                  value={this.state.lhsStep}
                  onChange={(e) =>
                    this.updateStep(Number(e.target.value), this.state.rhsStep)
                  }
                />
                    <span style={{ marginLeft: "1rem" }}>{this.state.lhsStep}</span>

              </label>
              <label style={{ marginLeft: "5rem" }}>
                RHS:&nbsp;
                <input
                  type="range"
                  min="1"
                  max={this.state.tableNodes.length}
                  value={this.state.rhsStep}
                  onChange={(e) =>
                    this.updateStep(this.state.lhsStep, Number(e.target.value))
                  }
                />
                    <span style={{ marginLeft: "1rem" }}>{this.state.rhsStep}</span>
              </label>
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
              {/*
              {this.state.tableEdges.map((edge, index) => (
                <svg key={index} className="edge-line">
                  <line
                    x1={`${(edge.from.id % this.state.x) * 100 / this.state.x + 50 / this.state.x}%`}
                    y1={`${(this.state.y - 1 - Math.floor(edge.from.id / this.state.x)) * 100 / this.state.y + 50 / this.state.y}%`}
                    x2={`${(edge.to.id % this.state.x) * 100 / this.state.x + 50 / this.state.x}%`}
                    y2={`${(this.state.y - 1 - Math.floor(edge.to.id / this.state.x)) * 100 / this.state.y + 50 / this.state.y}%`}
                  />
                </svg>
              ))}
              */}
              {this.state.tableNodes.map(node => (
                <div
                  key={node.id}
                  className={`node-container 
                    ${this.state.selectedTableNode === node.id ? 'selected' : ''}
                    ${this.state.sinkTableNode === node.id ? 'sink' : ''}
                    ${this.state.sourceTableNodes.some(source => source === node.id) ? 'source' : ''}
                    ${this.state.tableNodes[node.id].locked ? 'locked' : ''}`
                  }
                  style={{
                    left: `${(node.id % this.state.x) * 100 / this.state.x + 50 / this.state.x}%`,
                    top: `${(this.state.y - 1 - Math.floor(node.id / this.state.x)) * 100 / this.state.y + 50 / this.state.y}%`,
                  }}
                  onDoubleClick={() => this.openDialog(node)}
                >
                  <div className="node-coordinates">
                    {`(${Math.floor(node.id / this.state.x)}, ${node.id % this.state.x})`}
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
        {this.state.lockDialogOpen && this.state.lockDialogNode !== null && (
          <dialog
            open
            className="dialog-window"
            onClose={() => this.setState({
              lockDialogOpen: false,
              lockDialogNode: null
            })}
          >
            <h2>Edit Node</h2>
            <p>
              <strong>Index:</strong> {this.state.lockDialogNode.id}
            </p>
            <label>
              Value:
              <input
                type="number"
                value={this.state.dialogValue}
                onChange={(e) =>
                  this.setState({ dialogValue: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Locked:
              <input
                type="checkbox"
                checked={this.state.lockDialogLock}
                onChange={(e) =>
                  this.setState({ lockDialogLock: e.target.checked })
                }
              />
            </label>
            <div className="dialog-buttons">
              <button onClick={this.manualUpdate}>Save</button>
              <button onClick={() => this.setState({
                lockDialogOpen: false,
                lockDialogNode: null
              })}>
                Cancel
              </button>
            </div>
          </dialog>
        )}
        {this.state.constDialogOpen && (
          <dialog
            open
            className="dialog-window"
            onClose={() => this.setState({
              constDialogOpen: false
            })}
          >
            <h2>Add constant</h2>
            <label>
              Value:
              <input
                type="number"
                value={this.state.dialogValue}
                onChange={(e) =>
                  this.setState({ dialogValue: Number(e.target.value) })
                }
              />
            </label>
            <div className="dialog-buttons">
              <button onClick={() => this.addConstant(this.state.dialogValue)}>Save</button>
              <button onClick={() => this.setState({
                constDialogOpen: false
              })}>
                Cancel
              </button>
            </div>
          </dialog>
        )}
      </div>
    );
  }
}

export default App;