import React from 'react';
import { produce } from 'immer';
import * as go from 'gojs';
import './App.css';
import { LhsDiagramWrapper } from './lhsDiagram.tsx';

interface tableNode {
  id: number;
  x: number;
  y: number;
  text: string;
  connections: any[];
  value: number;
  locked: boolean;
  color: number;
}

interface tableEdge {
  from: tableNode;
  to: tableNode;
}

interface coords {
  x: number;
  y: number;
}

interface AppState {
  nodeDataArray: Array<go.ObjectData>;
  linkDataArray: Array<go.ObjectData>;
  modelData: go.ObjectData;
  selectedKey: number | null;
  skipsDiagramUpdate: boolean;
  currNodeKey: number;
  currEdgeKey: number;

  tableNodes: tableNode[][];
  selectedTableNode: coords | undefined;
  sinkTableNode: coords | undefined;
  sourceTableNodes: coords[];
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

  consts: number[];
  leftWidth: number; // percent of width for left section
}

const x = 12;
const y = 1;
const vals = 1;

//TYPE DEFINITIONS
const SINK = 0;
const SOURCE = 1;
const VARIABLE = 2;
const OPERATION = 3;

const listTemplate: number[] = [];
for (let i = 0; i < 16; i++) {
  listTemplate.push(Math.floor(Math.random() * 10));
}
const listA = listTemplate.slice().sort(() => Math.random() - 0.5);
const listB = listTemplate.slice().sort(() => Math.random() - 0.5);

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    const newNodes: tableNode[][] = [];
    //    for (let i = 0; i < x * y; i++) {
    //      newNodes.push({ id: i, text: `Node ${i}`, connections: [], value: NaN, locked: false });
    //    }
    for (let i = 0; i < y; i++) {
      newNodes.push([]);
      for (let j = 0; j < x; j++) {
        const index = j + i * x;
        newNodes[i].push({ id: index, x: j, y: i, text: `Node ${i}`, connections: [], value: NaN, locked: false, color: 0 });
      }
    }
    this.state = {
      nodeDataArray: [
        { key: 0, text: 'Output', tableX: -1, tableY: -1, isGroup: true, type: SINK, category: "sink" },
        { key: 1, nodeName: 'x', nodeValue: NaN, nodeText: "NaN", group: 0, type: VARIABLE, category: "immutable" },
        { key: 2, nodeName: 'y', nodeValue: NaN, nodeText: "NaN", group: 0, type: VARIABLE, category: "immutable" },
        { key: 3, nodeName: 'val1', nodeValue: NaN, nodeText: "NaN", group: 0, type: VARIABLE, category: "out" },
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

      lhsStep: 1,
      rhsStep: x * y,

      consts: [],
      leftWidth: 40,
    };
    this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleRelinkChange = this.handleRelinkChange.bind(this);

    this.handleSetSinkButton = this.handleSetSinkButton.bind(this);
    this.handleAddSourceButton = this.handleAddSourceButton.bind(this);
    this.handleDeleteButton = this.handleDeleteButton.bind(this);
    this.handleConstantButton = this.handleConstantButton.bind(this);
    this.handleConditionalButton = this.handleConditionalButton.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleListSelect = this.handleListSelect.bind(this);
  }

  createState(currState: AppState, partialState: Partial<AppState>): AppState {
    return {
      ...produce(currState, (draft) => {
        for (const key in partialState) {
          draft[key] = partialState[key];
        }
      })
    };
  }

  commitState(newState: AppState) {
    this.setState(newState);
  }

  private isDragging = false;

  handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    this.isDragging = true;
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
  }

  handleMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    // Calculate new left width as percent:
    let newLeftWidth = (e.clientX / window.innerWidth) * 100;
    if (newLeftWidth < 40) newLeftWidth = 40;
    if (newLeftWidth > 99) newLeftWidth = 99;
    this.setState({ leftWidth: newLeftWidth });
  }

  handleMouseUp() {
    this.isDragging = false;
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
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
        this.commitState(this.handleDeleteButton());
        break;
      }
      /*
      case 'ObjectSingleClicked': {
        const obj = e.subject;
        console.log("single clicked: ", obj.key);
        if (obj && obj.key >= 0) {
          
        }
        break;
      }
      case 'ObjectDoubleClicked': {
        console.log("double clicked: ", this.state.selectedKey);
        const obj = e.subject;
        if (obj && obj.key >= 0) {

        }
        break;
      }
      */
      default: break;
    }
  }

  handleModelChange(e: go.IncrementalData) {
    if (false) { return; }

    if (!e.insertedLinkKeys && !e.modifiedNodeData) return;


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
      this.commitState(
        this.updateDependencyNodeValues(this.createState(this.state, {
          linkDataArray: updatedLinkDataArray,
        }))
      );
    }
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
    state: AppState
  ): AppState {
    let nodeDataArray = state.nodeDataArray;
    let linkDataArray = state.linkDataArray;
    let tableNodes = state.tableNodes;
    let x = state.x;
    let y = state.y;
    let sink = state.sinkTableNode;
    let lhsStep = state.lhsStep;
    let rhsStep = state.rhsStep;
    let dummyArray = [...nodeDataArray];

    let updatedNodeDataArray = [...nodeDataArray];
    let updatedLinkDataArray = [...linkDataArray];
    //let updatedTableNodes = [...tableNodes]
    let updatedTableNodes = tableNodes.map(nodeList => nodeList.map(node => (({ ...node, value: NaN }))));

    if (sink === undefined) {
      sink = { x: 0, y: 0 };
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

    for (let i = 0; i < y; i++) {
      for (let j = 0; j < x; j++) {

        if (tableNodes[i][j].locked) {
          updatedTableNodes[i][j].value = tableNodes[i][j].value;
          console.log('locked:', i * x + j);
          //        console.log('value:', updatedTableNodes[i].value);
          continue;
        }

        let offsetX = j - sink.x;
        let offsetY = i - sink.y;

        for (let j = 0; j < orderedNodes.length; j++) {
          dummyArray = this.updateDependencyNodeFromDependencies(dummyArray, updatedTableNodes,
            orderedNodes[j], offsetX, offsetY, true, x, y, sink, reverseAdjacencyList.get(orderedNodes[j]));
        }
        //if (true) continue;

        let updatedSinkNode = dummyArray.find((node) => node.key === 3);
        if (updatedSinkNode) {
          if (i * x + j < rhsStep) {
            updatedTableNodes[i][j].value = updatedSinkNode.nodeValue;
          }
          else {
            updatedTableNodes[i][j].value = NaN;
          }

          console.log('i:', i * x + j);
          //        console.log('offset:', offset);
          //        console.log('value:', updatedSinkNode.nodeValue);
        }
        else {
          console.log('sorry:', i * x + j);
        }

        if (offsetX === 0) {
          updatedNodeDataArray = [...dummyArray];
        }
      }
    }

    for (let i = 0, j = 0; i < orderedNodes.length; i++) {
      const currNode = dummyArray.find((node) => node.key === orderedNodes[i]);
      const valid = j < lhsStep || currNode?.isGroup || currNode?.category === "immutable";
      if (valid && !(currNode?.isGroup || currNode?.category === "immutable")) {
        j++;
      }
      dummyArray = this.updateDependencyNodeFromDependencies(dummyArray, updatedTableNodes,
        orderedNodes[i], 0, 0, valid, x, y, sink, reverseAdjacencyList.get(orderedNodes[i]));
    }
    updatedNodeDataArray = [...dummyArray];

    let updatedSourceTableNodes: coords[] = [];
    for (let i = 0; i < updatedNodeDataArray.length; i++) {
      if (updatedNodeDataArray[i].type === SOURCE) {
        updatedSourceTableNodes.push({ x: updatedNodeDataArray[i].tableX, y: updatedNodeDataArray[i].tableY });
      }
    }

    return this.createState(state, {
      nodeDataArray: updatedNodeDataArray,
      tableNodes: updatedTableNodes,
      sourceTableNodes: updatedSourceTableNodes
    });
  }

  handleRelinkChange(e: React.ChangeEvent<HTMLInputElement>) {
    const model = { ...this.state.modelData, canRelink: e.target.checked };
    this.setState({ modelData: model });
  }

  updateDependencyNodeFromDependencies(
    nodeDataArray: Array<go.ObjectData>,
    tableNodes: tableNode[][],
    dKey: number,
    offsetX: number, offsetY: number,
    valid: boolean,
    x: number, y: number,
    sink: coords, deps?: go.ObjectData[]) {
    let updatedNodeDataArray = [...nodeDataArray];
    const index = nodeDataArray.findIndex((node) => node.key === dKey);

    //    console.log('index:', index);
    if (index === -1) {
      return updatedNodeDataArray;
    }
    else if (valid === false) {
      updatedNodeDataArray[index] = {
        ...updatedNodeDataArray[index],
        nodeValue: NaN,
        nodeText: "NaN"
      };
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

            updatedNodeDataArray[parentId] = {
              ...updatedNodeDataArray[parentId],
              tableX: leftDep.nodeValue,
              tableY: rightDep.nodeValue,
              //                tableOffsetX: offsetX,
              //                tableOffsetY: offsetY
            };

            if (rightDep.nodeValue >= 0 && rightDep.nodeValue < y && leftDep.nodeValue >= 0 && leftDep.nodeValue < x) {
              updatedNodeDataArray[index] = {
                ...updatedNodeDataArray[index],
                nodeValue: tableNodes[rightDep.nodeValue][leftDep.nodeValue].value,
                nodeText: this.formatValue(tableNodes[rightDep.nodeValue][leftDep.nodeValue].value)
              };
            } else {
              updatedNodeDataArray[index] = {
                ...updatedNodeDataArray[index],
                nodeValue: NaN,
                nodeText: "NaN"
              };
            }
          }
        }
        else if (updatedNodeDataArray[index].nodeName === "x") {
          updatedNodeDataArray[index] = {
            ...updatedNodeDataArray[index],
            nodeValue: sink.x + offsetX,
            nodeText: this.formatValue(sink.x + offsetX)
          };
        }
        else if (updatedNodeDataArray[index].nodeName === "y") {
          updatedNodeDataArray[index] = {
            ...updatedNodeDataArray[index],
            nodeValue: sink.y + offsetY,
            nodeText: this.formatValue(sink.y + offsetY)
          };
        }
        else {
          updatedNodeDataArray[index] = {
            ...updatedNodeDataArray[index],
            nodeValue: NaN,
            nodeText: "NaN"
          };
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
            let newValue = (dep.nodeValue === 0) ? 1 : 0;
            if (isNaN(dep.nodeValue)) {
              newValue = NaN;
            }
            updatedNodeDataArray[index] = {
              ...updatedNodeDataArray[index],
              nodeValue: newValue,
              nodeText: this.formatValue(newValue)
            };
          }
          else if (updatedNodeDataArray[index].nodeName === "List A") {
            let newValue = NaN;
            if (dep.nodeValue >= 0 && dep.nodeValue < listA.length) {
              newValue = listA[dep.nodeValue];
            }
            updatedNodeDataArray[index] = {
              ...updatedNodeDataArray[index],
              nodeValue: newValue,
              nodeText: newValue
            };
          }
          else if (updatedNodeDataArray[index].nodeName === "List B") {
            let newValue = NaN;
            if (dep.nodeValue >= 0 && dep.nodeValue < listB.length) {
              newValue = listB[dep.nodeValue];
            }
            updatedNodeDataArray[index] = {
              ...updatedNodeDataArray[index],
              nodeValue: newValue,
              nodeText: newValue
            };
          }
          else {
            updatedNodeDataArray[index] = {
              ...updatedNodeDataArray[index],
              nodeValue: dep.nodeValue,
              nodeText: this.formatValue(dep.nodeValue)
            };
          }
        }
      }
      else if (updatedNodeDataArray[index].nodeName === "x") {
        const parent = nodeDataArray.find((node) => node.key === nodeDataArray[index].group);
        const newX = sink.x + parent.tableOffsetX + offsetX;
        console.log('x - prev:', updatedNodeDataArray[index].nodeValue, ' newX:', newX);
        updatedNodeDataArray[index] = {
          ...updatedNodeDataArray[index],
          nodeValue: newX,
          nodeText: this.formatValue(newX)
        };
      }
      else if (updatedNodeDataArray[index].nodeName === "y") {
        const parent = nodeDataArray.find((node) => node.key === nodeDataArray[index].group);
        const newY = sink.y + parent.tableOffsetY + offsetY;
        console.log('y - prev:', updatedNodeDataArray[index].nodeValue, ' newY:', newY);
        updatedNodeDataArray[index] = {
          ...updatedNodeDataArray[index],
          nodeValue: newY,
          nodeText: this.formatValue(newY)
        };
      }
      else {
        updatedNodeDataArray[index] = {
          ...updatedNodeDataArray[index],
          nodeValue: NaN,
          nodeText: "NaN"
        };
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
          updatedNodeDataArray[index] = {
            ...updatedNodeDataArray[index],
            nodeValue: newValue,
            nodeText: this.formatValue(newValue)
          };
        }
      }
      else {
        updatedNodeDataArray[index] = {
          ...updatedNodeDataArray[index],
          nodeValue: NaN,
          nodeText: "NaN"
        };
      }
    }
    else if (updatedNodeDataArray[index].category === "conditional") {
      if (deps && deps.length > 0) {
        let ifDep: go.ObjectData | undefined = undefined;
        let thenDep: go.ObjectData | undefined = undefined;
        let elseDep: go.ObjectData | undefined = undefined;
        deps.forEach((dep) => {
          let depNode = nodeDataArray.find((node) => node.key === dep.from);
          if (dep.toPort === "topPort") {
            ifDep = depNode;
          }
          else if (dep.toPort === "leftPort") {
            thenDep = depNode;
          }
          else if (dep.toPort === "rightPort") {
            elseDep = depNode;
          }
        });

        let newValue = (ifDep && ifDep.nodeValue !== 0) ?
          ((thenDep) ?
            thenDep.nodeValue :
            NaN
          ) :
          ((elseDep) ?
            elseDep.nodeValue :
            NaN
          );
        console.log('conditional - ', 'if:', ifDep, ' then:', thenDep, ' else:', elseDep, ' newValue:', newValue);
        updatedNodeDataArray[index] = {
          ...updatedNodeDataArray[index],
          nodeValue: newValue,
          nodeText: this.formatValue(newValue)
        };
      }
      else {
        updatedNodeDataArray[index] = {
          ...updatedNodeDataArray[index],
          nodeValue: NaN,
          nodeText: "NaN"
        };
      }
    }

    //    console.log(updatedNodeDataArray[index].category)
    //    console.log('updated:', updatedNodeDataArray);
    return updatedNodeDataArray;
  }

  updateDependencyNodeFromTableNode(nodeDataArray: Array<go.ObjectData>, dKey: number, x: number, y: number, state?: AppState): Array<go.ObjectData> {
    if (state === undefined) {
      state = this.state;
    }

    let updatedNodeDataArray: Array<go.ObjectData>;

      updatedNodeDataArray = nodeDataArray.map((node) => {
        if (node.key === dKey) {
          return { ...node, tableX: x, tableY: y };
        }
        else if (node.key === dKey + 1) {
          return {
            ...node,
            nodeValue: x,
            nodeText: this.formatValue(x)
          };
        }
        else if (node.key === dKey + 2) {
          return {
            ...node,
            nodeValue: y,
            nodeText: this.formatValue(y)
          };
        }
        else if (node.key === dKey + 3) {
          let tValue = NaN;
          if (x >= 0 && x < state.x && y >= 0 && y < state.y) {
            tValue = state.tableNodes[y][x].value;
          }
          return {
            ...node,
            nodeValue: tValue,
            nodeText: this.formatValue(tValue)
          };
        }
        return node;
      });
    

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
      case 'Smaller/Equal':
        return (a <= b) ? 1 : 0;
      default:
        return NaN;
    }
  }

  addDependencyNodes(newNodes: Array<go.ObjectData>, state?: AppState): [AppState, number[]] {
    if (state === undefined) {
      state = this.state;
    }

    let updatedNodeDataArray = [...state.nodeDataArray];
    let newKey = state.currNodeKey + 1;
    let keys: number[] = [];
    for (let i = 0; i < newNodes.length; i++) {
      updatedNodeDataArray.push({ ...newNodes[i], key: newKey });
      //      console.log('key:', newKey);
      keys.push(newKey);
      newKey++;
    }

    const newState = this.createState(state, {
      nodeDataArray: updatedNodeDataArray,
      currNodeKey: state.currNodeKey + newNodes.length
    });

    return [newState, keys];
  }

  addDependencyEdges(newEdges: Array<go.ObjectData>, state?: AppState): [AppState, number[]] {
    if (state === undefined) {
      state = this.state;
    }

    let updatedLinkDataArray = [...state.linkDataArray];
    let newKey = state.currEdgeKey - 1;
    let keys: number[] = [];
    for (let i = 0; i < newEdges.length; i++) {
      updatedLinkDataArray.push({ ...newEdges[i], key: newKey });
      keys.push(newKey);
      newKey--;
    }

    const newState = this.createState(state, {
      linkDataArray: updatedLinkDataArray,
      currEdgeKey: state.currEdgeKey - newEdges.length
    });

    return [newState, keys];
  }

  handleSetSinkButton(state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }
    else {
      state = this.createState(state, {
        x: state.x
      });
    }

    if (state.selectedTableNode === undefined ||
      state.selectedTableNode === state.sinkTableNode) {
      return state;
    }
    else if (state.sinkTableNode !== undefined) {
      const offsetX = state.selectedTableNode.x - state.sinkTableNode.x;
      const offsetY = state.selectedTableNode.y - state.sinkTableNode.y;

      /*
      for (let i = 0; i < this.state.sourceTableNodes.length; i++) {
        const targetX = this.state.sourceTableNodes[i].x + offsetX;
        const targetY = this.state.sourceTableNodes[i].y + offsetY;
        if (targetX < 0 || targetX >= this.state.tableNodes[0].length
          || targetY < 0 || targetY >= this.state.tableNodes.length) {
          console.warn("source.id + offset out of bounds:", targetX, targetY);
          return;
        }
      }
      */

      let updatedNodeDataArray = [...state.nodeDataArray];
      state.nodeDataArray.forEach((node) => {
        if (node.tableX !== undefined && node.tableY !== undefined) {
          updatedNodeDataArray = this.updateDependencyNodeFromTableNode(
            updatedNodeDataArray,
            node.key,
            node.tableX + offsetX,
            node.tableY + offsetY,
            state
          );
        }
      });

      return this.updateDependencyNodeValues(this.createState(state, {
        nodeDataArray: updatedNodeDataArray,
        sinkTableNode: state.selectedTableNode,
        selectedTableNode: undefined,
      }));

    }
    else {
      let updatedNodeDataArray = this.updateDependencyNodeFromTableNode(
        [...state.nodeDataArray], 
        0,
        state.selectedTableNode.x,
        state.selectedTableNode.y,
        state
      );

      updatedNodeDataArray.forEach((node) => {
        if (node.tableOffsetX !== undefined && node.tableOffsetY !== undefined) {
          node.tableOffsetX = node.tableX - state.selectedTableNode.x;
          node.tableOffsetY = node.tableY - state.selectedTableNode.y;
        }
      });

      console.log('updated:', updatedNodeDataArray);

      return this.updateDependencyNodeValues(this.createState(state, {
        nodeDataArray: updatedNodeDataArray,
        sinkTableNode: state.selectedTableNode,
        selectedTableNode: undefined,

      }));
    }
  }

  handleAddSourceButton(state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    if (state.selectedTableNode === undefined ||
      state.selectedTableNode === state.sinkTableNode ||
      state.sourceTableNodes.some(source => source === state.selectedTableNode)) {
      return state;
    }
    else {
      const newSource = state.selectedTableNode;
      const newKey = state.currNodeKey + 1;
      const offX = newSource.x - ((state.sinkTableNode === undefined) ? 0 : state.sinkTableNode.x);
      const offY = newSource.y - ((state.sinkTableNode === undefined) ? 0 : state.sinkTableNode.y);
      const [nodedState, newKeys] = this.addDependencyNodes([
        {
          text: 'Input',
          tableX: newSource.x,
          tableY: newSource.y,
          tableOffsetX: offX,
          tableOffsetY: offY,
          isGroup: true,
          type: SOURCE, category: "source"
        },
        {
          nodeName: 'x',
          nodeValue: newSource.x,
          nodeText: newSource.x,
          group: newKey,
          type: VARIABLE, category: "mutable"
        },
        {
          nodeName: 'y',
          nodeValue: newSource.y,
          nodeText: newSource.y,
          group: newKey,
          type: VARIABLE, category: "mutable"
        },
        {
          nodeName: 'val1',
          nodeValue: state.tableNodes[newSource.y][newSource.x].value,
          nodeText: this.formatValue(state.tableNodes[newSource.y][newSource.x].value),
          group: newKey,
          type: VARIABLE, category: "immutable"
        },
      ], state);

      const [edgedState, _newKeys] = this.addDependencyEdges([
        { from: newKeys[1], to: newKeys[3], fromPort: "bottomPort", toPort: "leftPort", category: "hidden" },
        { from: newKeys[2], to: newKeys[3], fromPort: "bottomPort", toPort: "rightPort", category: "hidden" },
      ], nodedState);

      return this.createState(edgedState, {
        selectedTableNode: undefined,
        sourceTableNodes: [...edgedState.sourceTableNodes, newSource],
        lhsStep: edgedState.lhsStep + 2,
      });
    }
  }

  handleDeleteButton(state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    if (state.selectedKey === null || state.selectedKey === 0) {
      return state;
    }
    else if (state.selectedKey < 0) {
      const updatedLinkDataArray: Array<go.ObjectData> = state.linkDataArray.filter(link =>
        link.key !== state.selectedKey
      );

      return this.updateDependencyNodeValues(this.createState(state, {
        linkDataArray: updatedLinkDataArray,
        selectedKey: null
      }));
    }
    else {
      const targetNode = state.nodeDataArray.find(node => node.key === state.selectedKey);
      if (targetNode === undefined || targetNode.group !== undefined) {
        return state;
      }

      let removed: number[] = [];
      let updatedNodeDataArray: Array<go.ObjectData> = state.nodeDataArray.filter(node => {
        if (node.key === state.selectedKey) {
          removed.push(node.key);
          return false;
        }
        if (node.group !== undefined && node.group === state.selectedKey) {
          removed.push(node.key);
          return false;
        }
        return true;
      });

      let updatedSourceTableNodes: coords[] = [...state.sourceTableNodes];
      if (targetNode.type === SOURCE) {
        updatedSourceTableNodes = updatedSourceTableNodes.filter(
          source => source.x !== targetNode.tableX ||
            source.y !== targetNode.tableY
        );
      }

      let updateConsts: number[] = [...state.consts];
      if (state.consts.some(key => key === targetNode.key)) {
        updateConsts = updateConsts.filter(key => key !== targetNode.key);
      }

      let updatedLinkDataArray: Array<go.ObjectData> = state.linkDataArray.filter(link =>
        removed.includes(link.from) === false && removed.includes(link.to) === false
      );

      const newLhsMax = updatedNodeDataArray.length - 3 - updatedSourceTableNodes.length * 2 - updateConsts.length;

      return this.updateDependencyNodeValues(this.createState(state, {
        nodeDataArray: updatedNodeDataArray,
        linkDataArray: updatedLinkDataArray,
        sourceTableNodes: updatedSourceTableNodes,
        consts: updateConsts,
        lhsStep: Math.min(state.lhsStep, newLhsMax),
        selectedKey: null
      }));
    }
  }

  addOperationNode(operation: string, state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    const [nodedState, _newKeys] = this.addDependencyNodes([
      {
        nodeName: operation,
        nodeValue: NaN,
        nodeText: "NaN",
        type: OPERATION, category: "operation"
      },
    ], state);

    return this.createState(nodedState, {
      lhsStep: nodedState.lhsStep + 1,
    });
  }

  addMutableNode(name: string, state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    const [nodedState, _newKeys] = this.addDependencyNodes([
      {
        nodeName: name,
        nodeValue: NaN,
        nodeText: "NaN",
        type: OPERATION, category: "mutable"
      },
    ], state);

    return this.createState(nodedState, {
      lhsStep: nodedState.lhsStep + 1,
    });
  }

  handleListSelect(value: string, nodeKey: number) {
    console.log('list select:', value, nodeKey);
    let updatedNodeDataArray = [...this.state.nodeDataArray];
    let updatedLinkDataArray = [...this.state.linkDataArray];

    const link = updatedLinkDataArray.find((l) => l.to === nodeKey);
    let linkedNode = updatedNodeDataArray.find((node) => node.key === link?.from);

    let newLhsStep = this.state.lhsStep;

    console.log('link:', link);
    console.log('linkedNode:', linkedNode);

    if (linkedNode?.nodeName === "const") {
      updatedNodeDataArray = updatedNodeDataArray.filter((n) => n.key !== linkedNode?.key);
      newLhsStep--;
    }
    updatedLinkDataArray = updatedLinkDataArray.filter((l) => l.to !== nodeKey);

    const cleanedState = this.createState(this.state, {
      nodeDataArray: updatedNodeDataArray,
      linkDataArray: updatedLinkDataArray,
    });

    let newKeys: number[] = [];
    let edgedState = this.state;
    if (value === "x") {
      [edgedState, newKeys] = this.addDependencyEdges([
        { from: 1, to: nodeKey, fromPort: "bottomPort", toPort: "topPort" }
      ], cleanedState);
    }
    else if (value === "y") {
      [edgedState, newKeys] = this.addDependencyEdges([
        { from: 2, to: nodeKey, fromPort: "bottomPort", toPort: "topPort" }
      ], cleanedState);
    }
    else {
      const [nodedState, halfwayKeys] = this.addConstant(parseInt(value), cleanedState);
      [edgedState, newKeys] = this.addDependencyEdges([
        { from: halfwayKeys[0], to: nodeKey, fromPort: "bottomPort", toPort: "topPort" }
      ], nodedState);
      newLhsStep++;
    }

    console.log('nodes:', edgedState.nodeDataArray);
    console.log('links:', edgedState.linkDataArray);

    this.setState(this.updateDependencyNodeValues(this.createState(edgedState, {
      lhsStep: newLhsStep,
      skipsDiagramUpdate: false,
    }))
  );
  }

  handleConstantButton() {
    this.setState({
      constDialogOpen: true,
      lockDialogOpen: false,
      lockDialogNode: null,
    });
  }

  addConstant(value: number, state?: AppState): [AppState, number[]] {
    if (state === undefined) {
      state = this.state;
    }

    const [newState, newKeys] = this.addDependencyNodes([
      {
        nodeName: 'const',
        nodeValue: value,
        nodeText: this.formatValue(value),
        type: VARIABLE, category: "immutable"
      },
    ], state);

    return [this.createState(newState, {
      consts: state.consts.concat(newKeys),
    }), newKeys];
  }

  handleConditionalButton(state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    const [newState, _newKeys] = this.addDependencyNodes([
      {
        nodeName: "if",
        nodeValue: NaN,
        nodeText: "NaN",
        type: OPERATION, category: "conditional"
      },
    ], state);

    return this.createState(newState, {
      lhsStep: newState.lhsStep + 1,
    });
  }

  setSelectedNode(node: tableNode) {
    if (this.state.selectedTableNode?.x === node.x && this.state.selectedTableNode?.y === node.y) {
      this.setState({ selectedTableNode: undefined });
    } else {
      this.setState({ selectedTableNode: { x: node.x, y: node.y } });
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

  manualUpdate(state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    let newState = produce(state, draft => {

      if (draft.lockDialogNode) {
        const { x, y } = draft.lockDialogNode;
        draft.tableNodes[y][x].value = draft.dialogValue;
        draft.tableNodes[y][x].locked = draft.lockDialogLock;
      }

      draft.lockDialogOpen = false;
      draft.lockDialogNode = null;
    });

    return this.updateDependencyNodeValues(newState);
  };

  updateTableLengthY(nY: number, state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    if (
      state.sinkTableNode !== undefined &&
      (nY < state.sinkTableNode.y ||
        state.sourceTableNodes.some(source => nY < source.y))
    ) {
      console.warn("Table size is too small for the current sink/source nodes");
      return state;
    }

    let updatedTableNodes: tableNode[][] = [];
    for (let i = 0; i < nY; i++) {
      if (i < state.y) {
        updatedTableNodes.push(state.tableNodes[i]);
      } else {
        updatedTableNodes.push([]);
        for (let j = 0; j < state.x; j++) {
          updatedTableNodes[i].push({
            id: j + i * state.x,
            x: j, y: i,
            text: `Node ${j + i * state.x}`,
            connections: [],
            value: 0,
            locked: false,
            color: 0,
          });
        }
      }
    }


    const newRhsStep = (state.rhsStep === state.x * state.y) ? state.x * nY : Math.min(state.rhsStep, state.x * nY);
    return this.updateDependencyNodeValues(this.createState(state, {
      tableNodes: updatedTableNodes,
      y: nY,
      rhsStep: newRhsStep,
      selectedTableNode: undefined,
    }));
  }


  updateTableLengthX(nX: number, state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    if (
      state.sinkTableNode !== undefined &&
      (nX <= state.sinkTableNode.x ||
        state.sourceTableNodes.some(source => nX <= source.x))
    ) {
      console.warn("Table size is too small for the current sink/source nodes");
      return state;
    }

    let updatedTableNodes: tableNode[][] = [];
    for (let i = 0; i < state.y; i++) {
      updatedTableNodes.push([]);
      for (let j = 0; j < nX; j++) {
        if (j < state.x) {
          let currNode = state.tableNodes[i][j];
          updatedTableNodes[i].push({
            id: j + i * nX,
            x: j,
            y: i,
            text: `Node ${j + i * nX}`,
            connections: [],
            value: currNode.value,
            locked: currNode.locked,
            color: currNode.color,
          });
        } else {
          updatedTableNodes[i].push({
            id: j + i * nX,
            x: j,
            y: i,
            text: `Node ${j + i * nX}`,
            connections: [],
            value: 0,
            locked: false,
            color: 0,
          });
        }
      }
    }

    const newRhsStep = (state.rhsStep === state.x * state.y) ? nX * state.y : Math.min(state.rhsStep, nX * state.y);

    return this.updateDependencyNodeValues(this.createState(state, {
      tableNodes: updatedTableNodes,
      x: nX,
      rhsStep: newRhsStep,
      selectedTableNode: undefined,
    }));
  }

  updateStep(lhs: number, rhs: number, state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    return this.updateDependencyNodeValues(this.createState(state, {
      lhsStep: lhs,
      rhsStep: rhs,
    }));
  }

  formatValue(val: number): string {
    const valStr = val.toString();
    return valStr.length > 6
      ? Number(val).toExponential(1)
      : val.toString();
  }

  handleNodeMouseEnter(node: tableNode) {
    this.setState(
      produce((draft: AppState) => {
        if (draft.sinkTableNode === undefined) {
          return;
        }

        draft.tableNodes[node.y][node.x].color = 1;

        draft.sourceTableNodes.forEach((source) => {
          const newX = source.x - (draft.sinkTableNode.x - node.x);
          const newY = source.y - (draft.sinkTableNode.y - node.y);
          if (newX >= 0 && newX < draft.x && newY >= 0 && newY < draft.y) {
            draft.tableNodes[newY][newX].color = 2;
          }
        });
      })
    );
  }

  handleNodeMouseLeave(node: tableNode) {
    this.setState(
      produce((draft: AppState) => {
        if (draft.sinkTableNode === undefined) {
          return;
        }

        draft.tableNodes[node.y][node.x].color = 0;

        draft.sourceTableNodes.forEach((source) => {
          const newX = source.x - (draft.sinkTableNode.x - node.x);
          const newY = source.y - (draft.sinkTableNode.y - node.y);
          if (newX >= 0 && newX < draft.x && newY >= 0 && newY < draft.y) {
            draft.tableNodes[newY][newX].color = 0;
          }
        });
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
          <div className="left-section" style={{ width: `${this.state.leftWidth}%` }}>
            <div className="upper-part">
              <button onClick={() => this.commitState(this.handleSetSinkButton(this.state))}>Set Sink</button>
              <button onClick={() => this.commitState(this.handleAddSourceButton())}>Add Source</button>
              <button onClick={this.handleConstantButton}>Constant</button>
              <button onClick={() => this.commitState(this.handleDeleteButton())}>Delete</button>
              <button style={{ marginLeft: "2.5rem" }} onClick={() => this.commitState(this.addMutableNode("List A"))}>List A</button>
              <button onClick={() => this.commitState(this.addMutableNode("List B"))}>List B</button>
              <button
                style={{ marginLeft: "2.5rem" }}
                onClick={() => {
                  if (this.state.leftWidth >= 90) {
                    this.setState({ leftWidth: 40 });
                  } else {
                    this.setState({ leftWidth: 99 });
                  }
                }}
              >
                {this.state.leftWidth >= 90 ? "Show RHS" : "Hide RHS"}
              </button>              <br />
              <button onClick={() => this.commitState(this.addOperationNode('Addition'))}>Addition</button>
              <button onClick={() => this.commitState(this.addOperationNode('Subtraction'))}>Subtraction</button>
              <button onClick={() => this.commitState(this.addOperationNode('Multiplication'))}>Multiplication</button>
              <button onClick={() => this.commitState(this.addOperationNode('Division'))}>Division</button>
              <button onClick={() => this.commitState(this.addOperationNode('Modulo'))}>Modulo</button>
              <button onClick={() => this.commitState(this.addOperationNode('Minimum'))}>Minimum</button>
              <button onClick={() => this.commitState(this.addOperationNode('Maximum'))}>Maximum</button>
              <br />
              <button onClick={() => this.commitState(this.handleConditionalButton())}>Condition</button>
              <button onClick={() => this.commitState(this.addOperationNode('Or'))}>Or</button>
              <button onClick={() => this.commitState(this.addOperationNode('And'))}>And</button>
              <button onClick={() => this.commitState(this.addMutableNode('Not'))}>Not</button>
              <button onClick={() => this.commitState(this.addOperationNode('Equal'))}>Equal</button>
              <button onClick={() => this.commitState(this.addOperationNode('Smaller'))}>Smaller</button>
              <button onClick={() => this.commitState(this.addOperationNode('Smaller/Equal'))}>Smaller/Equal</button>
              <br />
              <label>
                x:
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={this.state.x}
                  onChange={(e) =>
                    this.commitState(this.updateTableLengthX(Number(e.target.value)))
                  }
                />
              </label>
              <label style={{ marginLeft: "3rem" }}>
                y:
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={this.state.y}
                  onChange={(e) =>
                    this.commitState(this.updateTableLengthY(Number(e.target.value)))
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
              <div className="sliderWrapper">
                <div className="labeledSlider">
                  <div className="sliderLabel">
                    Left Steps: {this.state.lhsStep}
                  </div>
                  <div className="slideContainer">
                    <input
                      type="range"
                      className="slider"
                      value={this.state.lhsStep}
                      min="0"
                      max={
                        this.state.nodeDataArray.length - 3 - (this.state.sourceTableNodes.length * 2) - this.state.consts.length
                      }
                      onChange={(e) =>
                        this.commitState(this.updateStep(Number(e.target.value), this.state.rhsStep))
                      }
                    />
                  </div>
                </div>
                <div className="labeledSlider">
                  <div className="sliderLabel">
                    Right Steps: {this.state.rhsStep}
                  </div>
                  <div className="slideContainer">
                    <input
                      type="range"
                      className="slider"
                      value={this.state.rhsStep}
                      min="0"
                      max={this.state.x * this.state.y}
                      onChange={(e) =>
                        this.commitState(this.updateStep(this.state.lhsStep, Number(e.target.value)))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="lower-part">
              <LhsDiagramWrapper
                nodeDataArray={this.state.nodeDataArray}
                linkDataArray={this.state.linkDataArray}
                modelData={this.state.modelData}
                skipsDiagramUpdate={this.state.skipsDiagramUpdate}
                onDiagramEvent={this.handleDiagramEvent}
                onModelChange={this.handleModelChange}
                listA={listA}
                listB={listB}
                handleListSelect={this.handleListSelect}
              />
            </div>
          </div>
          <div
            className="resizer"
            onMouseDown={this.handleMouseDown}
            style={{ left: `${this.state.leftWidth}%` }}
          />
          <div className="right-section" /* style={{ width: `${100 - this.state.leftWidth}%` }} */ >
            <div className="graph-area">
              {this.state.tableNodes.map(nodeList => nodeList.map(node => (

                <div
                  key={node.id}
                  className={`node-container 
                    ${this.state.selectedTableNode?.x === node.x && this.state.selectedTableNode?.y === node.y ?
                      'selected' : ''}
                    ${this.state.sinkTableNode?.x === node.x && this.state.sinkTableNode?.y === node.y ?
                      'sink' : ''}
                    ${this.state.sourceTableNodes.some(source => source.x === node.x && source.y === node.y) ?
                      'source' : ''}
                    ${this.state.tableNodes[node.y][node.x].locked ?
                      'locked' : ''}`
                  }
                  style={{
                    left: `${node.x * 100 / this.state.x + 50 / this.state.x}%`,
                    top: `${(this.state.y - 1 - node.y) * 100 / this.state.y + 50 / this.state.y}%`,
                  }}
                  onDoubleClick={() => this.openDialog(node)}
                >
                  <div className="node-coordinates">
                    {`(${node.y}, ${node.x})`}
                  </div>
                  <div
                    className={`graph-node
                      ${node.color === 1 ? 'hover-sink' : ''}
                      ${node.color === 2 ? 'hover-source' : ''}
                    `}
                    onClick={() => this.setSelectedNode(node)}
                    onMouseEnter={() => this.handleNodeMouseEnter(node)}
                    onMouseLeave={() => this.handleNodeMouseLeave(node)}
                  >
                    {this.formatValue(node.value)}
                  </div>
                </div>
              )))}
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
              <button onClick={() => this.commitState(this.manualUpdate())}>Save</button>
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
              <button onClick={() => {
                const [newState, newKeys] = this.addConstant(this.state.dialogValue);
                this.commitState(this.createState(newState, {
                  constDialogOpen: false,
                }));
              }
              }>Save</button>
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