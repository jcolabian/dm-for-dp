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
  value: number[];
  locked: boolean;
  hoverSink: boolean;
  hoverSource: boolean;
  sources: coords[];
}

interface coords {
  x: number;
  y: number;
}

interface AppState {
  nodeDataMap: Map<number, go.ObjectData>;
  linkDataMap: Map<number, go.ObjectData>;
  modelData: go.ObjectData;
  selectedKey: number | null;
  skipsDiagramUpdate: boolean;
  currNodeKey: number;
  currEdgeKey: number;

  tableNodes: tableNode[][];
  selectedTableNode: coords | undefined;
  sinkTableNode: coords | undefined;
  sourceTableNodes: coords[];

  lockDialogOpen: boolean;
  lockDialogNode: tableNode | null;
  dialogVal1: number;
  dialogVal2: number;
  dialogVal3: number;
  lockDialogLock: boolean;

  constDialogOpen: boolean;

  x: number;
  y: number;
  vals: number;

  lhsStep: number;
  rhsStep: number;

  consts: number[];
  leftWidth: number;
}

const initX = 12;
const initY = 1;
const initVals = 1;

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
    for (let i = 0; i < initY; i++) {
      newNodes.push([]);
      for (let j = 0; j < initX; j++) {
        const index = j + i * initX;
        newNodes[i].push({ id: index, x: j, y: i, text: `Node ${i}`, value: [NaN, NaN, NaN], locked: false, hoverSink: false, hoverSource: false, sources: [] });
      }
    }
    this.state = {
      nodeDataMap: new Map<number, go.ObjectData>([
        [0, { key: 0, text: 'Output', tableX: -1, tableY: -1, isGroup: true, category: "sink" }],
        [1, { key: 1, nodeName: 'x', nodeValue: NaN, nodeText: "NaN", group: 0, category: "immutable" }],
        [2, { key: 2, nodeName: 'y', nodeValue: NaN, nodeText: "NaN", group: 0, category: "immutable" }],
        [3, { key: 3, nodeName: 'val1', nodeValue: NaN, nodeText: "NaN", group: 0, category: "out" }],
      ]),
      linkDataMap: new Map<number, go.ObjectData>(),
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

      lockDialogOpen: false,
      lockDialogNode: null,
      dialogVal1: 0,
      dialogVal2: 0,
      dialogVal3: 0,
      lockDialogLock: false,

      constDialogOpen: false,

      x: initX,
      y: initY,
      vals: initVals,

      lhsStep: 1,
      rhsStep: initX * initY,

      consts: [],
      leftWidth: 40,
    };
    this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleRelinkChange = this.handleRelinkChange.bind(this);

    this.handleListSelect = this.handleListSelect.bind(this);
    this.handleConstantButton = this.handleConstantButton.bind(this);

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

  }

  formatValue(val: number): string {
    const valStr = val.toString();
    return valStr.length > 6
      ? Number(val).toExponential(1)
      : val.toString();
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
      default: break;
    }
  }

  handleRelinkChange(e: React.ChangeEvent<HTMLInputElement>) {
    const model = { ...this.state.modelData, canRelink: e.target.checked };
    this.setState({ modelData: model });
  }

  handleModelChange(e: go.IncrementalData) {
    if (false) { return; }

    if (!e.insertedLinkKeys && !e.modifiedNodeData) return;


    console.log("uoooooh i'm changing");
    let updatedLinkDataMap = new Map(this.state.linkDataMap);
    let currEdgeKey = this.state.currEdgeKey;


    e.insertedLinkKeys?.forEach((key) => {
      const link = e.modifiedLinkData?.find((link) => link.key === key);
      if (link && !this.state.linkDataMap.has(link.key)) {
        updatedLinkDataMap.set(link.key, link);
        currEdgeKey = Math.min(currEdgeKey, link.key);
      }
    });

    if (e.insertedLinkKeys) {
      this.commitState(
        this.updateDependencyNodeValues(this.createState(this.state, {
          linkDataMap: updatedLinkDataMap,
          currEdgeKey: currEdgeKey
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

  updateDependencyNodeValues(state: AppState): AppState {
    let x = state.x;
    let y = state.y;
    let sink = state.sinkTableNode;
    let lhsStep = state.lhsStep;
    let rhsStep = state.rhsStep;
    let dummyMap = new Map(state.nodeDataMap);

    let updatedNodeDataMap = new Map(state.nodeDataMap);
    let updatedLinkDataMap = new Map(state.linkDataMap);
    let updatedTableNodes = state.tableNodes.map(nodeList => nodeList.map(node => (({ ...node, value: [NaN, NaN, NaN] }))));

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
      Array.from(dummyMap.values()),
      Array.from(updatedLinkDataMap.values())
    );

    for (let i = 0; i < y; i++) {
      for (let j = 0; j < x; j++) {

        if (state.tableNodes[i][j].locked) {
          updatedTableNodes[i][j].value = state.tableNodes[i][j].value;
          console.log('locked:', i * x + j);
          continue;
        }

        if (i * x + j >= rhsStep) {
          updatedTableNodes[i][j].value = [NaN, NaN, NaN];
          continue;
        }

        let offsetX = j - sink.x;
        let offsetY = i - sink.y;

        for (let j = 0; j < orderedNodes.length; j++) {
          this.updateDependencyNodeFromDependencies(dummyMap, updatedTableNodes,
            orderedNodes[j], offsetX, offsetY, true, x, y, sink, reverseAdjacencyList.get(orderedNodes[j]));
        }

        dummyMap.forEach((node) => {
          if (node.category === "out") {
            console.log('out:', node);
            if (node.nodeName === "val1") {
              updatedTableNodes[i][j].value[0] = node.nodeValue;
            }
            else if (node.nodeName === "val2") {
              updatedTableNodes[i][j].value[1] = node.nodeValue;
            }
            else if (node.nodeName === "val3") {
              updatedTableNodes[i][j].value[2] = node.nodeValue;
            }
          }
        });

        let sources: coords[] = [];
        dummyMap.forEach((node) => {
          if (node.category === "source") {
            sources.push({ x: node.tableX, y: node.tableY });
          }
        });
        updatedTableNodes[i][j].sources = sources;
      }
    }

    for (let i = 0, j = 0; i < orderedNodes.length; i++) {
      const currNode = dummyMap.get(orderedNodes[i]);
      const valid = j < lhsStep || currNode?.isGroup || currNode?.category === "immutable";
      if (valid && !(currNode?.isGroup || currNode?.category === "immutable")) {
        j++;
      }
      this.updateDependencyNodeFromDependencies(dummyMap, updatedTableNodes,
        orderedNodes[i], 0, 0, valid, x, y, sink, reverseAdjacencyList.get(orderedNodes[i]));
    }
    updatedNodeDataMap = new Map(dummyMap);

    let updatedSourceTableNodes: coords[] = [];
    updatedNodeDataMap.forEach((node) => {
      if (node.category === "source") {
        updatedSourceTableNodes.push({ x: node.tableX, y: node.tableY });
      }
    });

    return this.createState(state, {
      nodeDataMap: updatedNodeDataMap,
      tableNodes: updatedTableNodes,
      sourceTableNodes: updatedSourceTableNodes
    });
  }

  updateDependencyNodeFromDependencies(
    nodeDataMap: Map<number, go.ObjectData>,
    tableNodes: tableNode[][],
    dKey: number,
    offsetX: number, offsetY: number,
    valid: boolean,
    x: number, y: number,
    sink: coords, deps?: go.ObjectData[]) {
    const target = nodeDataMap.get(dKey);

    if (target === undefined) {
      return nodeDataMap;
    }
    else if (valid === false) {
      nodeDataMap.set(dKey, {
        ...target,
        nodeValue: NaN,
        nodeText: "NaN"
      });
    }
    else if (target.category === "immutable") {
      if (target.group !== undefined) {
        if (deps && deps.length === 2) {
          let leftDep = nodeDataMap.get(deps[0].from);
          let rightDep = nodeDataMap.get(deps[1].from);

          if (leftDep && rightDep) {
            if (deps[0].toPort === "rightPort" && deps[1].toPort === "leftPort") {
              [leftDep, rightDep] = [rightDep, leftDep];
            }

            nodeDataMap.set(target.group, {
              ...nodeDataMap.get(target.group),
              tableX: leftDep.nodeValue,
              tableY: rightDep.nodeValue,
            });

            if (rightDep.nodeValue >= 0 && rightDep.nodeValue < y && leftDep.nodeValue >= 0 && leftDep.nodeValue < x) {
              let valNum = target.nodeName === "val1" ? 0 :
                target.nodeName === "val2" ? 1 : 2;

              nodeDataMap.set(dKey, {
                ...target,
                nodeValue: tableNodes[rightDep.nodeValue][leftDep.nodeValue].value[valNum],
                nodeText: this.formatValue(tableNodes[rightDep.nodeValue][leftDep.nodeValue].value[valNum])
              });
            } else {
              nodeDataMap.set(dKey, {
                ...target,
                nodeValue: NaN,
                nodeText: "NaN"
              });
            }
          }
        }
        else if (target.nodeName === "x") {
          nodeDataMap.set(dKey, {
            ...target,
            nodeValue: sink.x + offsetX,
            nodeText: this.formatValue(sink.x + offsetX)
          });
        }
        else if (target.nodeName === "y") {
          nodeDataMap.set(dKey, {
            ...target,
            nodeValue: sink.y + offsetY,
            nodeText: this.formatValue(sink.y + offsetY)
          });
        }
        else {
          nodeDataMap.set(dKey, {
            ...target,
            nodeValue: NaN,
            nodeText: "NaN"
          });
        }
      }
    }
    else if (target.category === "out" || target.category === "mutable") {
      if (deps && deps.length === 1) {
        const dep = nodeDataMap.get(deps[0].from);
        if (dep) {
          let newValue = this.executeUnaryOperation(target.nodeName, dep.nodeValue);

          nodeDataMap.set(dKey, {
            ...target,
            nodeValue: newValue,
            nodeText: this.formatValue(newValue)
          });
        }
      }
      else if (target.nodeName === "x") {
        const parent = nodeDataMap.get(target.group);

        if (parent === undefined) {
          throw new Error("no parent found");
        }

        const newX = sink.x + parent.tableOffsetX + offsetX;
        console.log('x - prev:', target.nodeValue, ' newX:', newX);
        nodeDataMap.set(dKey, {
          ...target,
          nodeValue: newX,
          nodeText: this.formatValue(newX)
        });
      }
      else if (target.nodeName === "y") {
        const parent = nodeDataMap.get(target.group);

        if (parent === undefined) {
          throw new Error("no parent found");
        }

        const newY = sink.y + parent.tableOffsetY + offsetY;
        console.log('y - prev:', target.nodeValue, ' newY:', newY);
        nodeDataMap.set(dKey, {
          ...target,
          nodeValue: newY,
          nodeText: this.formatValue(newY)
        });
      }
      else {
        nodeDataMap.set(dKey, {
          ...target,
          nodeValue: NaN,
          nodeText: "NaN"
        });
      }
    }
    else if (target.category === "operation") {
      if (deps && deps.length === 2) {
        let leftDep = nodeDataMap.get(deps[0].from);
        let rightDep = nodeDataMap.get(deps[1].from);
        if (leftDep && rightDep) {
          if (deps[0].toPort === "rightPort" && deps[1].toPort === "leftPort") {
            [leftDep, rightDep] = [rightDep, leftDep];
          }
          let newValue = this.executeBinaryOperation(target.nodeName, leftDep.nodeValue, rightDep.nodeValue);
          nodeDataMap.set(dKey, {
            ...target,
            nodeValue: newValue,
            nodeText: this.formatValue(newValue)
          });
        }
      }
      else {
        nodeDataMap.set(dKey, {
          ...target,
          nodeValue: NaN,
          nodeText: "NaN"
        });
      }
    }
    else if (target.category === "conditional") {
      if (deps && deps.length > 0) {
        let ifDep: go.ObjectData | undefined = undefined;
        let thenDep: go.ObjectData | undefined = undefined;
        let elseDep: go.ObjectData | undefined = undefined;
        deps.forEach((dep) => {
          let depNode = nodeDataMap.get(dep.from);
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
        nodeDataMap.set(dKey, {
          ...target,
          nodeValue: newValue,
          nodeText: this.formatValue(newValue)
        });
      }
      else {
        nodeDataMap.set(dKey, {
          ...target,
          nodeValue: NaN,
          nodeText: "NaN"
        });
      }
    }
    //    console.log(updatedNodeDataMap[index].category)
    //    console.log('updated:', updatedNodeDataMap);
  }

  updateDependencyNodeFromTableNode(
    nodeDataMap: Map<number, go.ObjectData>,
    dKey: number, x: number, y: number,
    state?: AppState):
    Map<number, go.ObjectData> {
    if (state === undefined) {
      state = this.state;
    }

    let updatedNodeDataMap = new Map<number, go.ObjectData>();

    nodeDataMap.forEach((node) => {
      if (node.key === dKey) {
        updatedNodeDataMap.set(node.key, { ...node, tableX: x, tableY: y });
      }
      else if (node.group === dKey && node.nodeName === 'x') {
        updatedNodeDataMap.set(node.key, {
          ...node,
          nodeValue: x,
          nodeText: this.formatValue(x)
        });
      }
      else if (node.group === dKey && node.nodeName === 'y') {
        updatedNodeDataMap.set(node.key, {
          ...node,
          nodeValue: y,
          nodeText: this.formatValue(y)
        });
      }
      else if (node.group === dKey && node.nodeName.startsWith('val')) {
        let valNum = node.nodeName === "val1" ? 0 :
          node.nodeName === "val2" ? 1 : 2;
        let tValue = NaN;
        if (x >= 0 && x < state.x && y >= 0 && y < state.y) {
          tValue = state.tableNodes[y][x].value[valNum];
        }
        updatedNodeDataMap.set(node.key, {
          ...node,
          nodeValue: tValue,
          nodeText: this.formatValue(tValue)
        });
      }
      else {
        updatedNodeDataMap.set(node.key, node);
      }
    });


    return updatedNodeDataMap;
  }

  executeUnaryOperation(operation: string, a: number): number {
    switch (operation) {
      case 'Not':
        return (a === 0) ? 1 : 0;
      case 'List A':
        return (a >= 0 && a < listA.length) ? listA[a] : NaN;
      case 'List B':
        return (a >= 0 && a < listB.length) ? listB[a] : NaN;
      default:
        return a;
    }
  }

  executeBinaryOperation(operation: string, a: number, b: number): number {
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
        return (isNaN(a) || isNaN(b)) ? 0 : (a !== 0 || b !== 0) ? 1 : 0;
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

    let updatedNodeDataMap = new Map(state.nodeDataMap);
    let newKey = state.currNodeKey;
    let keys: number[] = [];
    for (let i = 0; i < newNodes.length; i++) {
      newKey++;
      updatedNodeDataMap.set(newKey, { ...newNodes[i], key: newKey });
      keys.push(newKey);
    }

    const newState = this.createState(state, {
      nodeDataMap: updatedNodeDataMap,
      currNodeKey: newKey
    });

    return [newState, keys];
  }

  addDependencyEdges(newEdges: Array<go.ObjectData>, state?: AppState): [AppState, number[]] {
    if (state === undefined) {
      state = this.state;
    }

    let updatedLinkDataMap = new Map(state.linkDataMap);
    let newKey = state.currEdgeKey;
    let keys: number[] = [];
    for (let i = 0; i < newEdges.length; i++) {
      newKey--;
      updatedLinkDataMap.set(newKey, { ...newEdges[i], key: newKey });
      keys.push(newKey);
    }

    const newState = this.createState(state, {
      linkDataMap: updatedLinkDataMap,
      currEdgeKey: newKey
    });

    return [newState, keys];
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
        category: "operation"
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
        category: "mutable"
      },
    ], state);

    return this.createState(nodedState, {
      lhsStep: nodedState.lhsStep + 1,
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
        category: "immutable"
      },
    ], state);

    return [this.createState(newState, {
      consts: state.consts.concat(newKeys),
    }), newKeys];
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

      let updatedNodeDataMap = new Map(state.nodeDataMap);
      state.nodeDataMap.forEach((node) => {
        if (node.tableX !== undefined && node.tableY !== undefined) {
          updatedNodeDataMap = this.updateDependencyNodeFromTableNode(
            state.nodeDataMap,
            node.key,
            node.tableX + offsetX,
            node.tableY + offsetY,
            state
          );
        }
      });

      return this.updateDependencyNodeValues(this.createState(state, {
        nodeDataMap: updatedNodeDataMap,
        sinkTableNode: state.selectedTableNode,
        selectedTableNode: undefined,
      }));

    }
    else {
      let updatedNodeDataMap = this.updateDependencyNodeFromTableNode(
        state.nodeDataMap,
        0,
        state.selectedTableNode.x,
        state.selectedTableNode.y,
        state
      );

      updatedNodeDataMap.forEach((node) => {
        if (node.tableOffsetX !== undefined && node.tableOffsetY !== undefined) {
          updatedNodeDataMap.set(node.key, {
            ...node,
            tableOffsetX: node.tableX - state.selectedTableNode.x,
            tableOffsetY: node.tableY - state.selectedTableNode.y,
          });
        }
      });

      console.log('updated:', updatedNodeDataMap);

      return this.updateDependencyNodeValues(this.createState(state, {
        nodeDataMap: updatedNodeDataMap,
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

      let newNodes: Array<go.ObjectData> = [
        {
          text: 'Input',
          tableX: newSource.x,
          tableY: newSource.y,
          tableOffsetX: offX,
          tableOffsetY: offY,
          isGroup: true,
          category: "source"
        },
        {
          nodeName: 'x',
          nodeValue: newSource.x,
          nodeText: newSource.x,
          group: newKey,
          category: "mutable"
        },
        {
          nodeName: 'y',
          nodeValue: newSource.y,
          nodeText: newSource.y,
          group: newKey,
          category: "mutable"
        }
      ];

      for (let i = 0; i < state.vals; i++) {
        newNodes.push({
          nodeName: 'val' + (i + 1),
          nodeValue: state.tableNodes[newSource.y][newSource.x].value[i],
          nodeText: this.formatValue(state.tableNodes[newSource.y][newSource.x].value[i]),
          group: newKey,
          category: "immutable"
        });
      }

      const [nodedState, newKeys] = this.addDependencyNodes(newNodes, state);

      let edgedState = nodedState;
      let _newKeys: number[] = [];
      for (let i = 0; i < state.vals; i++) {
        [edgedState, _newKeys] = this.addDependencyEdges([
          { from: newKeys[1], to: newKeys[3 + i], fromPort: "bottomPort", toPort: "leftPort", category: "hidden" },
          { from: newKeys[2], to: newKeys[3 + i], fromPort: "bottomPort", toPort: "rightPort", category: "hidden" }
        ], edgedState);
      }

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
      const updatedLinkDataMap = new Map(state.linkDataMap);
      updatedLinkDataMap.delete(state.selectedKey);

      return this.updateDependencyNodeValues(this.createState(state, {
        linkDataMap: updatedLinkDataMap,
        selectedKey: null
      }));
    }
    else {
      const targetNode = state.nodeDataMap.get(state.selectedKey);
      if (targetNode === undefined || targetNode.group !== undefined) {
        return state;
      }

      let removed: number[] = [];
      let updatedNodeDataMap = new Map<number, go.ObjectData>();
      state.nodeDataMap.forEach(node => {
        if (node.key === state.selectedKey) {
          removed.push(node.key);
          //return false;
        }
        else if (node.group !== undefined && node.group === state.selectedKey) {
          removed.push(node.key);
          //return false;
        }
        else {
          updatedNodeDataMap.set(node.key, node);
          //return true;
        }
      });

      let updatedSourceTableNodes: coords[] = [...state.sourceTableNodes];
      if (targetNode.category === "source") {
        updatedSourceTableNodes = updatedSourceTableNodes.filter(
          source => source.x !== targetNode.tableX ||
            source.y !== targetNode.tableY
        );
      }

      let updateConsts: number[] = [...state.consts];
      if (state.consts.some(key => key === targetNode.key)) {
        updateConsts = updateConsts.filter(key => key !== targetNode.key);
      }

      let updatedLinkDataMap = new Map<number, go.ObjectData>();
      state.linkDataMap.forEach(link => {
        if (removed.includes(link.from) === false && removed.includes(link.to) === false) {
          updatedLinkDataMap.set(link.key, link);
        }
      });

      const newLhsMax = updatedNodeDataMap.size - 3 - updatedSourceTableNodes.length * 2 - updateConsts.length;

      return this.updateDependencyNodeValues(this.createState(state, {
        nodeDataMap: updatedNodeDataMap,
        linkDataMap: updatedLinkDataMap,
        sourceTableNodes: updatedSourceTableNodes,
        consts: updateConsts,
        lhsStep: Math.min(state.lhsStep, newLhsMax),
        selectedKey: null
      }));
    }
  }

  handleListSelect(value: string, nodeKey: number) {
    console.log('list select:', value, nodeKey);
    let updatedNodeDataMap = new Map(this.state.nodeDataMap);
    let updatedLinkDataMap = new Map(this.state.linkDataMap);

    let link: go.ObjectData | undefined;
    updatedLinkDataMap.forEach((value) => {
      if (value.to === nodeKey) {
        link = value;
      }
    });
    let linkedNode: go.ObjectData | undefined;
    updatedNodeDataMap.forEach((node) => {
      if (node.key === link?.from) {
        linkedNode = node;
      }
    });

    let newLhsStep = this.state.lhsStep;

    console.log('link:', link);
    console.log('linkedNode:', linkedNode);

    if (linkedNode?.nodeName === "const") {
      updatedNodeDataMap.delete(linkedNode.key);
      newLhsStep--;
    }
    updatedLinkDataMap = new Map(Array.from(updatedLinkDataMap).filter(([_, l]) => l.to !== nodeKey));

    const cleanedState = this.createState(this.state, {
      nodeDataMap: updatedNodeDataMap,
      linkDataMap: updatedLinkDataMap,
    });

    let _newKeys: number[] = [];
    let edgedState = this.state;
    if (value === "x") {
      [edgedState, _newKeys] = this.addDependencyEdges([
        { from: 1, to: nodeKey, fromPort: "bottomPort", toPort: "topPort" }
      ], cleanedState);
    }
    else if (value === "y") {
      [edgedState, _newKeys] = this.addDependencyEdges([
        { from: 2, to: nodeKey, fromPort: "bottomPort", toPort: "topPort" }
      ], cleanedState);
    }
    else {
      const [nodedState, halfwayKeys] = this.addConstant(parseInt(value), cleanedState);
      [edgedState, _newKeys] = this.addDependencyEdges([
        { from: halfwayKeys[0], to: nodeKey, fromPort: "bottomPort", toPort: "topPort" }
      ], nodedState);
      newLhsStep++;
    }

    console.log('nodes:', edgedState.nodeDataMap);
    console.log('links:', edgedState.linkDataMap);

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

  handleConditionalButton(state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    const [newState, _newKeys] = this.addDependencyNodes([
      {
        nodeName: "if",
        nodeValue: NaN,
        nodeText: "NaN",
        category: "conditional"
      },
    ], state);

    return this.createState(newState, {
      lhsStep: newState.lhsStep + 1,
    });
  }

  updateNodeLock(state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    let newState = produce(state, draft => {

      if (draft.lockDialogNode) {
        const { x, y } = draft.lockDialogNode;
        draft.tableNodes[y][x].value[0] = draft.dialogVal1;
        if (draft.vals > 1) {
          draft.tableNodes[y][x].value[1] = draft.dialogVal2;
        }
        if (draft.vals > 2) {
          draft.tableNodes[y][x].value[2] = draft.dialogVal3;
        }
        draft.tableNodes[y][x].locked = draft.lockDialogLock;
        draft.tableNodes[y][x].sources = [];
      }

      draft.lockDialogOpen = false;
      draft.lockDialogNode = null;
    });

    return this.updateDependencyNodeValues(newState);
  };

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
            value: currNode.value,
            locked: currNode.locked,
            hoverSink: currNode.hoverSink,
            hoverSource: currNode.hoverSource,
            sources: currNode.sources,
          });
        } else {
          updatedTableNodes[i].push({
            id: j + i * nX,
            x: j,
            y: i,
            text: `Node ${j + i * nX}`,
            value: [NaN, NaN, NaN],
            locked: false,
            hoverSink: false,
            hoverSource: false,
            sources: [],
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
            value: [NaN, NaN, NaN],
            locked: false,
            hoverSink: false,
            hoverSource: false,
            sources: [],
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

  updateVals(nVals: number, state?: AppState): AppState {
    if (state === undefined) {
      state = this.state;
    }

    let valuedState = state;

    if (nVals < state.vals) {
      let updatedNodeDataMap = new Map<number, go.ObjectData>();
      let updatedLinkDataMap = new Map<number, go.ObjectData>();
      let removed: number[] = [];
      state.nodeDataMap.forEach((node) => {
        if (node.nodeName?.startsWith('val') && parseInt(node.nodeName[3]) > nVals) {
          removed.push(node.key);
        }
        else {
          updatedNodeDataMap.set(node.key, node);
        }
      });
      state.linkDataMap.forEach((link) => {
        if (removed.includes(link.from) === false && removed.includes(link.to) === false)
          updatedLinkDataMap.set(link.key, link);
      });

      valuedState = this.createState(state, {
        nodeDataMap: updatedNodeDataMap,
        linkDataMap: updatedLinkDataMap,
      });
    }
    else if (nVals > state.vals) {
      let newNodes: Array<go.ObjectData> = [];
      let nodeGroups: number[] = [];
      for (let i = state.vals; i < nVals; i++) {
        newNodes.push({
          nodeName: 'val' + (i + 1),
          nodeValue: NaN,
          nodeText: "NaN",
          group: 0,
          category: "out",
        });
        nodeGroups.push(0);
        state.nodeDataMap.forEach((node) => {
          if (node.isGroup && node.category === "source") {
            let newValue = NaN;
            if (node.tableX >= 0 && node.tableX < state.x && node.tableY >= 0 && node.tableY < state.y) {
              newValue = state.tableNodes[node.tableY][node.tableX].value[i];
            }

            newNodes.push({
              nodeName: 'val' + (i + 1),
              nodeValue: newValue,
              nodeText: this.formatValue(newValue),
              group: node.key,
              category: "immutable",
            });
            nodeGroups.push(node.key);
          }
        });
      }
      let [nodedState, newKeys] = this.addDependencyNodes(newNodes, state);

      let newEdges: Array<go.ObjectData> = [];
      for (let i = 0; i < newKeys.length; i++) {
        if (nodeGroups[i] === 0) {
          continue;
        }

        newEdges.push({
          from: nodeGroups[i] + 1,
          to: newKeys[i],
          fromPort: "bottomPort",
          toPort: "leftPort",
          category: "hidden"
        });
        newEdges.push({
          from: nodeGroups[i] + 2,
          to: newKeys[i],
          fromPort: "bottomPort",
          toPort: "rightPort",
          category: "hidden"
        });
      }

      let _newEdgeKeys: number[];
      [valuedState, _newEdgeKeys] = this.addDependencyEdges(newEdges, nodedState);
    }

    return this.createState(valuedState, {
      lhsStep: state.lhsStep + nVals - state.vals,
      vals: nVals,
    });
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
        dialogVal1: 0,
        dialogVal2: 0,
        dialogVal3: 0,
        lockDialogLock: false,
      });
      return;
    }
    this.setState({
      lockDialogOpen: true,
      lockDialogNode: node,
      dialogVal1: node.value[0],
      dialogVal2: node.value[1],
      dialogVal3: node.value[2],
      lockDialogLock: true,
    });
  };

  handleNodeMouseEnter(node: tableNode) {
    this.setState(
      produce((draft: AppState) => {
        if (draft.sinkTableNode === undefined) {
          return;
        }

        draft.tableNodes[node.y][node.x].hoverSink = true;

        draft.tableNodes[node.y][node.x].sources.forEach((source) => {
          if (source.x < 0 || source.x >= draft.x ||
            source.y < 0 || source.y >= draft.y) {
            return;
          }
          draft.tableNodes[source.y][source.x].hoverSource = true;
        });

        /*
        draft.sourceTableNodes.forEach((source) => {
          const newX = source.x - (draft.sinkTableNode.x - node.x);
          const newY = source.y - (draft.sinkTableNode.y - node.y);
          if (newX >= 0 && newX < draft.x && newY >= 0 && newY < draft.y) {
            draft.tableNodes[newY][newX].color = 2;
          }
        });
        */
      })
    );
  }

  handleNodeMouseLeave(node: tableNode) {
    this.setState(
      produce((draft: AppState) => {
        if (draft.sinkTableNode === undefined) {
          return;
        }

        draft.tableNodes[node.y][node.x].hoverSink = false;
        draft.tableNodes[node.y][node.x].sources.forEach((source) => {
          if (source.x < 0 || source.x >= draft.x ||
            source.y < 0 || source.y >= draft.y) {
            return;
          }
          draft.tableNodes[source.y][source.x].hoverSource = false;
        });

        /*
        draft.sourceTableNodes.forEach((source) => {
          const newX = source.x - (draft.sinkTableNode.x - node.x);
          const newY = source.y - (draft.sinkTableNode.y - node.y);
          if (newX >= 0 && newX < draft.x && newY >= 0 && newY < draft.y) {
            draft.tableNodes[newY][newX].color = 0;
          }
        });
        */
      })
    );
  }

  private isDragging = false;

  handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    this.isDragging = true;
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
  }

  handleMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

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

  render() {
    console.log('nodeDataArray', this.state.nodeDataMap);
    console.log('linkDataArray', this.state.linkDataMap);
    console.log('tableNodes', this.state.tableNodes);

    return (
      <div className="App">
        <div className="split-view">
          <div className="left-section" style={{ width: `${this.state.leftWidth}%` }}>
            <div className="upper-part">
              <button onClick={() => this.commitState(this.handleSetSinkButton(this.state))}>Set Sink</button>
              <button onClick={() => this.commitState(this.handleAddSourceButton())}>Add Source</button>
              <button onClick={this.handleConstantButton}>Constant</button>
              <button onClick={() => this.commitState(this.handleDeleteButton())}>Delete</button>
              <button style={{ marginLeft: "2.5rem" }}
                onClick={() => this.commitState(this.addMutableNode("List A"))}>List A</button>
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

              <label style={{ marginLeft: "3rem" }}>
                values:
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={this.state.vals}
                  onChange={(e) =>
                    this.commitState(this.updateVals(Number(e.target.value)))
                  }
                />
              </label>

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
                        this.state.nodeDataMap.size - 3 //output group, x, y
                        - this.state.sourceTableNodes.length //input group
                        - this.state.sourceTableNodes.length * this.state.vals //input values
                        - this.state.consts.length //constants
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
                nodeDataArray={Array.from(this.state.nodeDataMap.values())}
                linkDataArray={Array.from(this.state.linkDataMap.values())}
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
                      ${node.hoverSink ? 'hover-sink' : ''}
                      ${node.hoverSource ? 'hover-source' : ''}
                    `}
                    onClick={() => this.setSelectedNode(node)}
                    onMouseEnter={() => this.handleNodeMouseEnter(node)}
                    onMouseLeave={() => this.handleNodeMouseLeave(node)}
                  >
                    {this.formatValue(node.value[0])}
                  </div>
                </div>
              )))}
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
              Value 1:
              <input
                type="number"
                value={this.state.dialogVal1}
                onChange={(e) =>
                  this.setState({ dialogVal1: Number(e.target.value) })
                }
              />
            </label>
            {this.state.vals > 1 && (
              <><br></br>
                <label>
                  Value 2:
                  <input
                    type="number"
                    value={this.state.dialogVal2}
                    onChange={(e) => this.setState({ dialogVal2: Number(e.target.value) })} />
                </label></>
            )}
            {this.state.vals > 2 && (
              <><br></br>
                <label>
                  Value 3:
                  <input
                    type="number"
                    value={this.state.dialogVal3}
                    onChange={(e) =>
                      this.setState({ dialogVal3: Number(e.target.value) })
                    }
                  />
                </label></>
            )}
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
              <button onClick={() => this.commitState(this.updateNodeLock())}>Save</button>
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
                value={this.state.dialogVal1}
                onChange={(e) =>
                  this.setState({ dialogVal1: Number(e.target.value) })
                }
              />
            </label>
            <div className="dialog-buttons">
              <button onClick={() => {
                const [newState, _newKeys] = this.addConstant(this.state.dialogVal1);
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