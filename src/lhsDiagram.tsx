import * as go from 'gojs';
import { ReactDiagram } from 'gojs-react';
import * as React from 'react';

// props passed in from a parent component holding state, some of which will be passed to ReactDiagram
interface WrapperProps {
  nodeDataArray: Array<go.ObjectData>;
  linkDataArray: Array<go.ObjectData>;
  modelData: go.ObjectData;
  skipsDiagramUpdate: boolean;
  onDiagramEvent: (e: go.DiagramEvent) => void;
  onModelChange: (e: go.IncrementalData) => void;
}

export class LhsDiagramWrapper extends React.Component<WrapperProps, {}> {
  /**
   * Ref to keep a reference to the component, which provides access to the GoJS diagram via getDiagram().
   */
  private diagramRef: React.RefObject<ReactDiagram>;

  constructor(props: WrapperProps) {
    super(props);
    this.diagramRef = React.createRef();
  }

  /**
   * Get the diagram reference and add any desired diagram listeners.
   * Typically the same function will be used for each listener,
   * with the function using a switch statement to handle the events.
   * This is only necessary when you want to define additional app-specific diagram listeners.
   */
  public componentDidMount() {
    if (!this.diagramRef.current) return;
    const diagram = this.diagramRef.current.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.addDiagramListener('ChangedSelection', this.props.onDiagramEvent);
    }
  }

  /**
   * Get the diagram reference and remove listeners that were added during mounting.
   * This is only necessary when you have defined additional app-specific diagram listeners.
   */
  public componentWillUnmount() {
    if (!this.diagramRef.current) return;
    const diagram = this.diagramRef.current.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.removeDiagramListener('ChangedSelection', this.props.onDiagramEvent);
    }
  }

  /**
   * Diagram initialization method, which is passed to the ReactDiagram component.
   * This method is responsible for making the diagram and initializing the model, any templates,
   * and maybe doing other initialization tasks like customizing tools.
   * The model's data should not be set here, as the ReactDiagram component handles that via the other props.
   */
  private initDiagram = (): go.Diagram => {
    console.log("Initializing diagram");
    const $ = go.GraphObject.make;
    const diagram = $(go.Diagram, {
      'undoManager.isEnabled': true,
      model: $(go.GraphLinksModel, {
        linkKeyProperty: 'key'
      })
    });

    const makePort = (n: number): go.Shape[] => {
      switch (n) {
        case 1:
          return [
            $(go.Shape, "Circle",
              {
                desiredSize: new go.Size(12, 12),
                alignment: go.Spot.Top,
                margin: new go.Margin(-6, 0, 0, 0),
                fill: "black",
                stroke: null,
                portId: "topPort",
                fromLinkable: false, toLinkable: true,
                toMaxLinks: 1,
                fromLinkableDuplicates: false, toLinkableDuplicates: false,
                toSpot: go.Spot.Top,
                cursor: "pointer"
              }
            )
          ];
        case 2:
          return [
            $(go.Shape, "Circle",
              {
                desiredSize: new go.Size(12, 12),
                alignment: go.Spot.Left,
                margin: new go.Margin(0, 0, 0, -6),
                fill: "black",
                stroke: null,
                portId: "leftPort",
                fromLinkable: false, toLinkable: true,
                toMaxLinks: 1,
                fromLinkableDuplicates: false, toLinkableDuplicates: false,
                toSpot: go.Spot.Left,
                cursor: "pointer"
              }
            ),
            $(go.Shape, "Circle",
              {
                desiredSize: new go.Size(12, 12),
                alignment: go.Spot.Right,
                margin: new go.Margin(0, -6, 0, 0),
                fill: "black",
                stroke: null,
                portId: "rightPort",
                fromLinkable: false, toLinkable: true,
                toMaxLinks: 1,
                fromLinkableDuplicates: false, toLinkableDuplicates: false,
                toSpot: go.Spot.Right,
                cursor: "pointer"
              }
            )
          ];
        case 3:
          return [
            $(go.Shape, "Circle",
              {
                desiredSize: new go.Size(12, 12),
                alignment: go.Spot.Left,
                margin: new go.Margin(0, 0, 0, -6),
                fill: "black",
                stroke: null,
                portId: "leftPort",
                fromLinkable: false, toLinkable: true,
                toMaxLinks: 1,
                fromLinkableDuplicates: false, toLinkableDuplicates: false,
                toSpot: go.Spot.Left,
                cursor: "pointer"
              }
            ),
            $(go.Shape, "Circle",
              {
                desiredSize: new go.Size(12, 12),
                alignment: go.Spot.Right,
                margin: new go.Margin(0, -6, 0, 0),
                fill: "black",
                stroke: null,
                portId: "rightPort",
                fromLinkable: false, toLinkable: true,
                toMaxLinks: 1,
                fromLinkableDuplicates: false, toLinkableDuplicates: false,
                toSpot: go.Spot.Right,
                cursor: "pointer"
              }
            ),
            $(go.Shape, "Circle",
              {
                desiredSize: new go.Size(12, 12),
                alignment: go.Spot.Top,
                margin: new go.Margin(-6, 0, 0, 0),
                fill: "black",
                stroke: null,
                portId: "topPort",
                fromLinkable: false, toLinkable: true,
                toMaxLinks: 1,
                fromLinkableDuplicates: false, toLinkableDuplicates: false,
                toSpot: go.Spot.Top,
                cursor: "pointer"
              }
            )
          ];
        default:
          return [];
      }
    };

    const makeNodeContent = (from: boolean, toCount: number): go.Part => {
      return $(go.Node, "Auto",
        {
          selectable: true,
          resizable: false,
        },
        $(go.Shape, "RoundedRectangle",
          {
            fill: "#ffffff",
            stroke: "#000000",
            strokeWidth: 2,
            width: 100,
            height: 56,
          }
        ),
        $(go.Panel, "Vertical",
          { alignment: go.Spot.Center },
          $(go.TextBlock,
            {
              text: "Name",
              font: "bold 12px Segoe UI, sans-serif",
              stroke: "#000000"
            },
            new go.Binding("text", "nodeName")
          ),
          $(go.Shape, "LineH",
            {
              stroke: "#000000",
              strokeWidth: 1,
              width: 100,
              height: 6
            }
          ),
          $(go.TextBlock,
            {
              text: "Value",
              font: "12px Segoe UI, sans-serif",
              stroke: "#000000"
            },
            new go.Binding("text", "nodeValue")
          )
        ),
        makePort(toCount),
        (from ?
          $(go.Shape, "Circle",
            {
              desiredSize: new go.Size(12, 12),
              alignment: go.Spot.Bottom,
              margin: new go.Margin(0, 0, -6, 0),
              fill: "black",
              stroke: null,
              portId: "bottomPort",
              fromLinkable: true, toLinkable: false,
              fromMaxLinks: Infinity,
              fromLinkableDuplicates: false, toLinkableDuplicates: false,
              fromSpot: go.Spot.Bottom,
              cursor: "pointer"
            }
          )
          : []),
      );
    };

    diagram.nodeTemplate = makeNodeContent(true, 1);

    diagram.nodeTemplateMap.add("operation", makeNodeContent(true, 2));

    diagram.nodeTemplateMap.add("mutable", makeNodeContent(true, 1));

    diagram.nodeTemplateMap.add("immutable", makeNodeContent(true, 0));

    diagram.nodeTemplateMap.add("out", makeNodeContent(false, 1));

    diagram.linkTemplate = $(
      go.Link,
      {
        mouseEnter: (e, link) => link.elt(0).stroke = "rgba(0,90,156,0.3)",
        mouseLeave: (e, link) => link.elt(0).stroke = "transparent",
        routing: go.Routing.AvoidsNodes
      },
      $(go.Shape, { isPanelMain: true, stroke: "transparent", strokeWidth: 8 }),
      $(go.Shape, { isPanelMain: true }),
      $(go.Shape, { toArrow: 'Standard' })
    );

    diagram.linkTemplateMap.add("hidden", $(go.Link));

    diagram.groupTemplate = $(
      go.Group, "Spot",
      {
        layout: $(go.GridLayout, { wrappingColumn: 5, spacing: new go.Size(10, 10) })
      },
      $(go.Panel, "Auto",
        { name: "BODY" },
        $(go.Shape, "RoundedRectangle",
          { fill: "rgba(128,128,128,0.2)", stroke: "gray", strokeWidth: 2 }
        ),
        $(go.Placeholder, { padding: 10 })
      ),
      $(go.TextBlock,
        {
          alignment: new go.Spot(0, 0, 0, -10),
          alignmentFocus: go.Spot.Left,
          font: "bold 16px Segoe UI, sans-serif",
          stroke: "#000000",
          margin: 0
        },
        new go.Binding("text", "text")
      )
    );

    diagram.validCycle = go.CycleMode.NotDirected;

    diagram.toolManager.linkingTool.isEnabled = true;
    //    diagram.toolManager.linkingTool.linkValidation

    diagram.model =
      $(go.GraphLinksModel,
        {
          linkFromPortIdProperty: "fromPort",
          linkToPortIdProperty: "toPort"
        }
      );

    diagram.allowClipboard = false;

    //diagram.allowSelect = false;
    //diagram.allowZoom = false;
    diagram.allowCopy = false;
    //diagram.allowDelete = false;
    //diagram.allowHorizontalScroll = false;
    //diagram.allowVerticalScroll = false;
    diagram.allowTextEdit = false;

    //diagram.toolManager.draggingTool.isEnabled = false;
    //diagram.toolManager.clickCreatingTool.isEnabled = false;
    //diagram.toolManager.dragSelectingTool.isEnabled = false;
    //diagram.toolManager.linkingTool.isEnabled = false;
    //diagram.toolManager.resizingTool.isEnabled = false;
    //diagram.toolManager.rotatingTool.isEnabled = false;
    //diagram.toolManager.panningTool.isEnabled = false;
    //diagram.toolManager.textEditingTool.isEnabled = false;

    //diagram.toolManager.hoverDelay = Infinity;

    //diagram.contextMenu = null;

    diagram.commandHandler.deleteSelection = () => {
      this.props.onDiagramEvent({
        name: "SelectionDeletingCustom",
        subject: diagram.selection,
        diagram: diagram,
        parameter: null
      });
    };

    /*
    diagram.addDiagramListener("MouseUp", (e: go.DiagramEvent) => {
      // Check if the released button is right (button === 2)
      if (e.button === 2) {
        // Find the node (if any) under the mouse point
        const node = diagram.findPartAt(e.documentPoint, true);
        if (node instanceof go.Node) {
          // Call your custom event logic
          this.props.onDiagramEvent({
            name: "CustomLinkingRequestRelease",
            subject: node,
            diagram: diagram,
            parameter: null
          });
          // Optionally mark the event as handled:
          e.handled = true;
        }
      }
    });
    */

    return diagram;
  }

  public render() {
    return (
      <ReactDiagram
        ref={this.diagramRef}
        divClassName='diagram-component'
        initDiagram={this.initDiagram}
        nodeDataArray={this.props.nodeDataArray}
        linkDataArray={this.props.linkDataArray}
        modelData={this.props.modelData}
        onModelChange={this.props.onModelChange}
        skipsDiagramUpdate={this.props.skipsDiagramUpdate}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
}