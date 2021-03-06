import { IONode } from "./ionode"
import { GraphicsGate } from "./graphicsgate";
import { SerializedObject, SerializedCircuit, OutputConnection } from "./interfaces";
import challenges, { ChallengeObject } from "./challenges";
import Storage from "./storage"
import { concatSet } from "./utils";

export function resetCircuits()
{
    for (let type in challenges)
    {
        Storage.set(type, null);
    }
    
    Storage.set("sandbox", null);
}

export function loadCircuits()
{
    //resetCircuits();

    for (let type in challenges)
    {
        let c = challenges[type];
        let saved = Storage.get(type, null);

        if (saved === null)
        {
            let gate = new CircuitGate(type, c.label);

            c.inputs.forEach(inputLabel =>
            {
                gate.addInput(new IONode(inputLabel));
            });

            c.outputs.forEach(outputLabel =>
            {
                gate.addOutput(new IONode(outputLabel));
            });

            saved = {
                solution: JSON.stringify(gate.serializeCircuit()),
                solved: false
            };

            Storage.set(type, saved);
        }

        c.solution = saved.solution;
        c.solved = saved.solved;
    }
}

export class Gate
{
    protected inputNodes : IONode[] = [];
    protected outputNodes : IONode[] = [];
    public label : string;
    public id : number;
    public type : string;

    public x : number = 0;
    public y : number = 0;

    constructor()
    {
        
    }

    public get numInputs() : number
    {
        return this.inputNodes.length;
    }

    public get numOutputs() : number
    {
        return this.outputNodes.length;
    }

    public indexOfInput(input : IONode) : number
    {
        return this.inputNodes.indexOf(input);
    }

    public indexOfOutput(output : IONode) : number
    {
        return this.outputNodes.indexOf(output);
    }

    public getInput(index : number) : IONode
    {
        return this.inputNodes[index];
    }

    public getOutput(index : number) : IONode
    {
        return this.outputNodes[index];
    }

    public addInput(input : IONode, id? : number) : IONode
    {
        return this.addNode(input, true, id);
    }

    public addOutput(output : IONode, id? : number) : IONode
    {
        return this.addNode(output, false, id);
    }

    public addNode(node : IONode, isInput : boolean, id? : number) : IONode
    {
        if (id === undefined)
        {
            id = this.genId();
        }
        else if (this.getIdList().indexOf(id) !== -1)
        {
            throw "duplicate ids!!!";
        }

        node.id = id;
        node.parentGate = this;

        if (isInput)
        {
            this.inputNodes.push(node);
        }
        else
        {
            this.outputNodes.push(node);
        }

        return node;
    }

    public removeInput(input : IONode) : void
    {
        let n = this.inputNodes.splice(this.inputNodes.indexOf(input), 1)[0];
        n.clearAllConnections();
    }

    public removeOutput(output : IONode) : void
    {
        let n = this.outputNodes.splice(this.outputNodes.indexOf(output), 1)[0];
        n.clearAllConnections();
    }

    public removeNode(node : IONode, isInput : boolean) : void
    {
        if (isInput)
        {
            this.removeInput(node);
        }
        else
        {
            this.removeOutput(node);
        }
    }

    public nodeWithId(id : number) : IONode
    {
        return this.inputNodes.find(node => node.id === id) || this.outputNodes.find(node => node.id === id);
    }

    public forEachInput(fn : Function) : IONode[]
    {
        let ret = [];

        this.inputNodes.forEach((node, i) =>
        {
            let res = fn(node, i);
            if (res === true)
            {
                ret.push(node);
            }
        });

        return ret;
    }

    public forEachOutput(fn : Function) : IONode[]
    {
        let ret = [];

        this.outputNodes.forEach((node, i) =>
        {
            let res = fn(node, i);
            if (res === true)
            {
                ret.push(node);
            }
        });

        return ret;
    }

    public forEachNode(fn : Function) : IONode[]
    {
        return this.forEachInput(fn).concat(this.forEachOutput(fn));
    }

    public get outputValues() : number[]
    {
        return this.outputNodes.map(node => node.value);
    }

    protected getIdList() : number[]
    {
        let ret = [];

        this.inputNodes.forEach(node => ret.push(node.id));
        this.outputNodes.forEach(node => ret.push(node.id));

        return ret;
    }

    protected genId() : number
    {
        let list = this.getIdList();

        let counter = -1;

        while (true)
        {
            counter++;
            if (list.indexOf(counter) === -1)
            {
                break;
            }
        }

        return counter;
    }

    public clearAllConnections() : void
    {
        this.forEachNode(node =>
        {
            node.clearAllConnections();
        });
    }
}

export class CircuitGate extends Gate
{
    private gates : CircuitGate[] = [];
    public graphicsGate : GraphicsGate = null;

    constructor(type : string, label : string)
    {
        super();
        this.type = type;
        this.label = label;
        this.id = -1;
    }

    public gateWithId(id : number) : CircuitGate
    {
        return this.gates.find(gate => gate.id === id);
    }

    public addInput(input : IONode, id? : number) : IONode
    {
        let ret = super.addInput(input);
        input.onvalueset = this.nodeFn.bind(this);
        return ret;
    }

    /*public addOutput(output : IONode, id? : number) : IONode
    {
        super.addOutput(output);
        //output.onvalueset = this.nodeFn.bind(this);
    }*/

    public addGate(gate : CircuitGate, id? : number) : CircuitGate
    {
        if (id === undefined)
        {
            id = this.genId();
        }
        else if (this.getIdList().indexOf(id) !== -1)
        {
            throw "duplicate gate ids!!!!";
        }
        
        gate.id = id;

        this.gates.push(gate);
        return gate;
    }

    public removeGate(gate : CircuitGate) : void
    {
        let g = this.gates.splice(this.gates.indexOf(gate), 1)[0];
        g.clearAllConnections();
    }

    public forEachGate(fn : Function) : CircuitGate[]
    {
        let ret = [];

        this.gates.forEach((gate, i) =>
        {
            let res = fn(gate, i);
            if (res === true)
            {
                ret.push(gate);
            }
        });

        return ret;
    }

    public getIdList() : number[]
    {
        return super.getIdList().concat(this.gates.map(gate => gate.id));
    }

    protected nodeFn() : void
    {
        
    }

    public gateWithNode(node : IONode) : CircuitGate
    {
        return this.gates.find(gate =>
        {
            return gate.inputNodes.indexOf(node) !== -1
                || gate.outputNodes.indexOf(node) !== -1;
        });
    }

    public connect(outputIndex : number, gate : CircuitGate, inputIndex : number)
    {
        let srcNode = this.getOutput(outputIndex);
        let destNode = gate.getInput(inputIndex);
        
        return {
            result: srcNode.connect(destNode),
            srcNode: srcNode,
            destNode: destNode
        };
    }

    public connectNode(outputIndex : number, node : IONode)
    {
        let srcNode = this.getOutput(outputIndex);
        let destNode = node;

        return {
            result: srcNode.connect(destNode),
            srcNode: srcNode,
            destNode: destNode
        };
    }

    public serialize() : SerializedObject
    {
        let ret = {
            type: this.type,
            id: this.id,
            label: this.label,
            x : this.x,
            y : this.y,
            outputConnections: []
        };

        this.outputNodes.forEach((outputNode, oi) =>
        {
            outputNode.outputNodes.forEach((node, i) =>
            {
                let cid : number;
                let cind : number;

                if (node.parentGate.id === -1)
                {
                    cid = node.id;
                    cind = -1;
                }
                else
                {
                    let ogate = node.parentGate;
                    cid = ogate.id;
                    cind = ogate.indexOfInput(node);
                }
    
                let o =
                {
                    outputIndex: oi,
                    connectingToId: cid,
                    connectingToInputIndex: cind
                };
    
                ret.outputConnections.push(o);
            });
        });

        return ret;
    }

    public serializeCircuit() : SerializedCircuit
    {
        let ret = {
            type: this.type,
            label: this.label,
            id: this.id,
            components: []
        };

        this.inputNodes.forEach(node =>
        {
            ret.components.push(node.serialize(true));
        });

        this.outputNodes.forEach(node =>
        {
            ret.components.push(node.serialize(false));
        });

        this.gates.forEach(gate =>
        {
            ret.components.push(gate.serialize());
        });

        return ret;
    }

    public clone() : CircuitGate
    {
        return CircuitGate.fromSerializedCircuit(this.serializeCircuit());
    }

    public static ofType(type : string)
    {
        //console.log(challenges[type].solution);
        return CircuitGate.fromSerializedCircuit(JSON.parse(challenges[type].solution));
    }

    public static fromSerializedCircuit(circuit : SerializedCircuit) : CircuitGate
    {
        let ret = new CircuitGate(circuit.type, circuit.label);
        let map = new Map();

        circuit.components.forEach(c =>
        {
            if (c.type === "inputNode")
            {
                let n = ret.addInput(new IONode(c.label), c.id);
                map.set(n, c);
            }
            else if (c.type === "outputNode")
            {
                let n = ret.addOutput(new IONode(c.label), c.id);
                map.set(n, c);
            }
            else
            {
                let g;
                
                switch (c.type)
                {
                    case "BUILTIN_ONE": g = new OneGate(); break;
                    case "BUILTIN_ZERO": g = new ZeroGate(); break;
                    case "BUILTIN_AND": g = new ANDGate(); break;
                    case "BUILTIN_NAND": g = new NANDGate(); break;
                    case "BUILTIN_OR": g = new ORGate(); break;
                    case "BUILTIN_NOR": g = new NORGate(); break;
                    case "BUILTIN_XOR": g = new XORGate(); break;
                    case "BUILTIN_NXOR": g = new NXORGate(); break;
                    case "BUILTIN_NOT": g = new NOTGate(); break;
                    default:
                    {
                        if (!challenges[c.type])
                        {
                            throw "no gate/circuit/w.e with type "
                                + c.type + " was found sorry";
                        }

                        g = CircuitGate.ofType(c.type);
                        break;
                    }
                }

                g.x = c.x;
                g.y = c.y;

                ret.addGate(g, c.id);
                map.set(g, c);
            }
        });

        map.forEach((value : SerializedObject, key : IONode | CircuitGate) =>
        {
            let connections = value.outputConnections;

            connections.forEach((c : OutputConnection) =>
            {
                let srcNode : IONode;
                if (key instanceof IONode)
                {
                    srcNode = key;
                }
                else
                {
                    srcNode = key.getOutput(c.outputIndex);
                }

                let destNode : IONode = ret.nodeWithId(c.connectingToId)
                    || ret.gateWithId(c.connectingToId).getInput(c.connectingToInputIndex);
                // test ids bla bla
                srcNode.connect(destNode);
            });
        });

        return ret;
    }

    public get gateTypesUsed() : Set<string>
    {
        let ret = new Set<string>();
        
        this.gates.forEach((gate : CircuitGate) =>
        {
            ret.add(gate.type);
            concatSet(ret, gate.gateTypesUsed);
        });

        return ret;
    }
}

export class ConstantGate extends CircuitGate
{
    constructor(type : string, label : string)
    {
        super(type, label);

        this.addOutput(new IONode("output"));
    }
}

export class OneGate extends ConstantGate
{
    constructor()
    {
        super("BUILTIN_ONE", "1");
        this.outputNodes[0].value = 1;
    }

    public clone() : CircuitGate
    {
        return new OneGate();
    }
}

export class ZeroGate extends ConstantGate
{
    constructor()
    {
        super("BUILTIN_ZERO", "0");
        this.outputNodes[0].value = 0;
    }

    public clone() : CircuitGate
    {
        return new ZeroGate();
    }
}

export class NOTGate extends CircuitGate
{
    constructor()
    {
        super("BUILTIN_NOT", "NOT");

        this.addInput(new IONode("input"));
        this.addOutput(new IONode("output"));
    }

    public nodeFn() : void
    {
        if (this.inputNodes[0].value === IONode.NO_VALUE)
        {
            this.outputNodes[0].value = IONode.NO_VALUE;
        }
        else
        {
            this.outputNodes[0].value = this.inputNodes[0].value ^ 1;
        }
    }

    public clone() : CircuitGate
    {
        return new NOTGate();
    }
}

export class OpGate extends CircuitGate
{
    constructor(type : string, label : string)
    {
        super(type, label);
        
        this.addInput(new IONode("input1"));
        this.addInput(new IONode("input2"));
        this.addOutput(new IONode("output"));
    }

    protected nodeFn() : void
    {
        if (this.inputNodes[0].value !== IONode.NO_VALUE
            && this.inputNodes[1].value !== IONode.NO_VALUE)
        {
            this.outputNodes[0].value = this.gateFn();
        }
        else
        {
            this.outputNodes[0].value = IONode.NO_VALUE;
            this.outputNodes[0].propagate();
        }
    }

    protected gateFn() : number
    {
        return -1;
    }

    public serializeCircuit() : SerializedCircuit
    {
        throw "YOU CAN'T SERIALIZE AN OPGATE LIKE A CIRCUIT STUPID DUMB DUMB!!";
    }
}

export class ANDGate extends OpGate
{
    constructor()
    {
        super("BUILTIN_AND", "AND");
    }

    protected gateFn() : number
    {
        return this.inputNodes[0].value & this.inputNodes[1].value;
    }

    public clone() : CircuitGate
    {
        return new ANDGate();
    }
}

export class ORGate extends OpGate
{
    constructor()
    {
        super("BUILTIN_OR", "OR");
    }

    protected gateFn() : number
    {
        return this.inputNodes[0].value | this.inputNodes[1].value;
    }

    public clone() : CircuitGate
    {
        return new ORGate();
    }
}

export class NANDGate extends OpGate
{
    constructor()
    {
        super("BUILTIN_NAND", "NAND");
    }

    protected gateFn() : number
    {
        return (this.inputNodes[0].value & this.inputNodes[1].value) ^ 1;
    }

    public clone() : CircuitGate
    {
        return new NANDGate();
    }
}

export class NORGate extends OpGate
{
    constructor()
    {
        super("BUILTIN_NOR", "NOR");
    }

    protected gateFn() : number
    {
        return (this.inputNodes[0].value | this.inputNodes[1].value) ^ 1;
    }

    public clone() : CircuitGate
    {
        return new NORGate();
    }
}

export class XORGate extends OpGate
{
    constructor()
    {
        super("BUILTIN_XOR", "XOR");
    }

    protected gateFn() : number
    {
        return this.inputNodes[0].value ^ this.inputNodes[1].value;
    }

    public clone() : CircuitGate
    {
        return new XORGate();
    }
}

export class NXORGate extends OpGate
{
    constructor()
    {
        super("BUILTIN_NXOR", "NXOR");
    }

    protected gateFn() : number
    {
        return (this.inputNodes[0].value ^ this.inputNodes[1].value) ^ 1;
    }

    public clone() : CircuitGate
    {
        return new NXORGate();
    }
}

export class ShallowGate extends CircuitGate
{
    constructor(label : string, numInputs : number, numOutputs : number)
    {
        super("shallow", label);

        for (let i = 0; i < numInputs; i++)
        {
            this.inputNodes.push(new IONode(""));
        }

        for (let i = 0; i < numOutputs; i++)
        {
            this.outputNodes.push(new IONode(""));
        }
    }

    public serializeCircuit() : SerializedCircuit
    {
        throw "DON'T SERIALIZE A SHALLOW GATE WTF!!!";
    }
}