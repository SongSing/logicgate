var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "./ionode", "./challenges", "./storage", "./utils"], function (require, exports, ionode_1, challenges_1, storage_1, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function resetCircuits() {
        for (var type in challenges_1.default) {
            storage_1.default.set(type, null);
        }
        storage_1.default.set("sandbox", null);
    }
    exports.resetCircuits = resetCircuits;
    function loadCircuits() {
        var _loop_1 = function (type) {
            var c = challenges_1.default[type];
            var saved = storage_1.default.get(type, null);
            if (saved === null) {
                var gate_1 = new CircuitGate(type, c.label);
                c.inputs.forEach(function (inputLabel) {
                    gate_1.addInput(new ionode_1.IONode(inputLabel));
                });
                c.outputs.forEach(function (outputLabel) {
                    gate_1.addOutput(new ionode_1.IONode(outputLabel));
                });
                saved = {
                    solution: JSON.stringify(gate_1.serializeCircuit()),
                    solved: false
                };
                storage_1.default.set(type, saved);
            }
            c.solution = saved.solution;
            c.solved = saved.solved;
        };
        for (var type in challenges_1.default) {
            _loop_1(type);
        }
    }
    exports.loadCircuits = loadCircuits;
    var Gate = (function () {
        function Gate() {
            this.inputNodes = [];
            this.outputNodes = [];
            this.x = 0;
            this.y = 0;
        }
        Object.defineProperty(Gate.prototype, "numInputs", {
            get: function () {
                return this.inputNodes.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Gate.prototype, "numOutputs", {
            get: function () {
                return this.outputNodes.length;
            },
            enumerable: true,
            configurable: true
        });
        Gate.prototype.indexOfInput = function (input) {
            return this.inputNodes.indexOf(input);
        };
        Gate.prototype.indexOfOutput = function (output) {
            return this.outputNodes.indexOf(output);
        };
        Gate.prototype.getInput = function (index) {
            return this.inputNodes[index];
        };
        Gate.prototype.getOutput = function (index) {
            return this.outputNodes[index];
        };
        Gate.prototype.addInput = function (input, id) {
            return this.addNode(input, true, id);
        };
        Gate.prototype.addOutput = function (output, id) {
            return this.addNode(output, false, id);
        };
        Gate.prototype.addNode = function (node, isInput, id) {
            if (id === undefined) {
                id = this.genId();
            }
            else if (this.getIdList().indexOf(id) !== -1) {
                throw "duplicate ids!!!";
            }
            node.id = id;
            node.parentGate = this;
            if (isInput) {
                this.inputNodes.push(node);
            }
            else {
                this.outputNodes.push(node);
            }
            return node;
        };
        Gate.prototype.removeInput = function (input) {
            var n = this.inputNodes.splice(this.inputNodes.indexOf(input), 1)[0];
            n.clearAllConnections();
        };
        Gate.prototype.removeOutput = function (output) {
            var n = this.outputNodes.splice(this.outputNodes.indexOf(output), 1)[0];
            n.clearAllConnections();
        };
        Gate.prototype.removeNode = function (node, isInput) {
            if (isInput) {
                this.removeInput(node);
            }
            else {
                this.removeOutput(node);
            }
        };
        Gate.prototype.nodeWithId = function (id) {
            return this.inputNodes.find(function (node) { return node.id === id; }) || this.outputNodes.find(function (node) { return node.id === id; });
        };
        Gate.prototype.forEachInput = function (fn) {
            var ret = [];
            this.inputNodes.forEach(function (node, i) {
                var res = fn(node, i);
                if (res === true) {
                    ret.push(node);
                }
            });
            return ret;
        };
        Gate.prototype.forEachOutput = function (fn) {
            var ret = [];
            this.outputNodes.forEach(function (node, i) {
                var res = fn(node, i);
                if (res === true) {
                    ret.push(node);
                }
            });
            return ret;
        };
        Gate.prototype.forEachNode = function (fn) {
            return this.forEachInput(fn).concat(this.forEachOutput(fn));
        };
        Object.defineProperty(Gate.prototype, "outputValues", {
            get: function () {
                return this.outputNodes.map(function (node) { return node.value; });
            },
            enumerable: true,
            configurable: true
        });
        Gate.prototype.getIdList = function () {
            var ret = [];
            this.inputNodes.forEach(function (node) { return ret.push(node.id); });
            this.outputNodes.forEach(function (node) { return ret.push(node.id); });
            return ret;
        };
        Gate.prototype.genId = function () {
            var list = this.getIdList();
            var counter = -1;
            while (true) {
                counter++;
                if (list.indexOf(counter) === -1) {
                    break;
                }
            }
            return counter;
        };
        Gate.prototype.clearAllConnections = function () {
            this.forEachNode(function (node) {
                node.clearAllConnections();
            });
        };
        return Gate;
    }());
    exports.Gate = Gate;
    var CircuitGate = (function (_super) {
        __extends(CircuitGate, _super);
        function CircuitGate(type, label) {
            var _this = _super.call(this) || this;
            _this.gates = [];
            _this.graphicsGate = null;
            _this.type = type;
            _this.label = label;
            _this.id = -1;
            return _this;
        }
        CircuitGate.prototype.gateWithId = function (id) {
            return this.gates.find(function (gate) { return gate.id === id; });
        };
        CircuitGate.prototype.addInput = function (input, id) {
            var ret = _super.prototype.addInput.call(this, input);
            input.onvalueset = this.nodeFn.bind(this);
            return ret;
        };
        CircuitGate.prototype.addGate = function (gate, id) {
            if (id === undefined) {
                id = this.genId();
            }
            else if (this.getIdList().indexOf(id) !== -1) {
                throw "duplicate gate ids!!!!";
            }
            gate.id = id;
            this.gates.push(gate);
            return gate;
        };
        CircuitGate.prototype.removeGate = function (gate) {
            var g = this.gates.splice(this.gates.indexOf(gate), 1)[0];
            g.clearAllConnections();
        };
        CircuitGate.prototype.forEachGate = function (fn) {
            var ret = [];
            this.gates.forEach(function (gate, i) {
                var res = fn(gate, i);
                if (res === true) {
                    ret.push(gate);
                }
            });
            return ret;
        };
        CircuitGate.prototype.getIdList = function () {
            return _super.prototype.getIdList.call(this).concat(this.gates.map(function (gate) { return gate.id; }));
        };
        CircuitGate.prototype.nodeFn = function () {
        };
        CircuitGate.prototype.gateWithNode = function (node) {
            return this.gates.find(function (gate) {
                return gate.inputNodes.indexOf(node) !== -1
                    || gate.outputNodes.indexOf(node) !== -1;
            });
        };
        CircuitGate.prototype.connect = function (outputIndex, gate, inputIndex) {
            var srcNode = this.getOutput(outputIndex);
            var destNode = gate.getInput(inputIndex);
            return {
                result: srcNode.connect(destNode),
                srcNode: srcNode,
                destNode: destNode
            };
        };
        CircuitGate.prototype.connectNode = function (outputIndex, node) {
            var srcNode = this.getOutput(outputIndex);
            var destNode = node;
            return {
                result: srcNode.connect(destNode),
                srcNode: srcNode,
                destNode: destNode
            };
        };
        CircuitGate.prototype.serialize = function () {
            var ret = {
                type: this.type,
                id: this.id,
                label: this.label,
                x: this.x,
                y: this.y,
                outputConnections: []
            };
            this.outputNodes.forEach(function (outputNode, oi) {
                outputNode.outputNodes.forEach(function (node, i) {
                    var cid;
                    var cind;
                    if (node.parentGate.id === -1) {
                        cid = node.id;
                        cind = -1;
                    }
                    else {
                        var ogate = node.parentGate;
                        cid = ogate.id;
                        cind = ogate.indexOfInput(node);
                    }
                    var o = {
                        outputIndex: oi,
                        connectingToId: cid,
                        connectingToInputIndex: cind
                    };
                    ret.outputConnections.push(o);
                });
            });
            return ret;
        };
        CircuitGate.prototype.serializeCircuit = function () {
            var ret = {
                type: this.type,
                label: this.label,
                id: this.id,
                components: []
            };
            this.inputNodes.forEach(function (node) {
                ret.components.push(node.serialize(true));
            });
            this.outputNodes.forEach(function (node) {
                ret.components.push(node.serialize(false));
            });
            this.gates.forEach(function (gate) {
                ret.components.push(gate.serialize());
            });
            return ret;
        };
        CircuitGate.prototype.clone = function () {
            return CircuitGate.fromSerializedCircuit(this.serializeCircuit());
        };
        CircuitGate.ofType = function (type) {
            return CircuitGate.fromSerializedCircuit(JSON.parse(challenges_1.default[type].solution));
        };
        CircuitGate.fromSerializedCircuit = function (circuit) {
            var ret = new CircuitGate(circuit.type, circuit.label);
            var map = new Map();
            circuit.components.forEach(function (c) {
                if (c.type === "inputNode") {
                    var n = ret.addInput(new ionode_1.IONode(c.label), c.id);
                    map.set(n, c);
                }
                else if (c.type === "outputNode") {
                    var n = ret.addOutput(new ionode_1.IONode(c.label), c.id);
                    map.set(n, c);
                }
                else {
                    var g = void 0;
                    switch (c.type) {
                        case "BUILTIN_ONE":
                            g = new OneGate();
                            break;
                        case "BUILTIN_ZERO":
                            g = new ZeroGate();
                            break;
                        case "BUILTIN_AND":
                            g = new ANDGate();
                            break;
                        case "BUILTIN_NAND":
                            g = new NANDGate();
                            break;
                        case "BUILTIN_OR":
                            g = new ORGate();
                            break;
                        case "BUILTIN_NOR":
                            g = new NORGate();
                            break;
                        case "BUILTIN_XOR":
                            g = new XORGate();
                            break;
                        case "BUILTIN_NXOR":
                            g = new NXORGate();
                            break;
                        case "BUILTIN_NOT":
                            g = new NOTGate();
                            break;
                        default:
                            {
                                if (!challenges_1.default[c.type]) {
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
            map.forEach(function (value, key) {
                var connections = value.outputConnections;
                connections.forEach(function (c) {
                    var srcNode;
                    if (key instanceof ionode_1.IONode) {
                        srcNode = key;
                    }
                    else {
                        srcNode = key.getOutput(c.outputIndex);
                    }
                    var destNode = ret.nodeWithId(c.connectingToId)
                        || ret.gateWithId(c.connectingToId).getInput(c.connectingToInputIndex);
                    srcNode.connect(destNode);
                });
            });
            return ret;
        };
        Object.defineProperty(CircuitGate.prototype, "gateTypesUsed", {
            get: function () {
                var ret = new Set();
                this.gates.forEach(function (gate) {
                    ret.add(gate.type);
                    utils_1.concatSet(ret, gate.gateTypesUsed);
                });
                return ret;
            },
            enumerable: true,
            configurable: true
        });
        return CircuitGate;
    }(Gate));
    exports.CircuitGate = CircuitGate;
    var ConstantGate = (function (_super) {
        __extends(ConstantGate, _super);
        function ConstantGate(type, label) {
            var _this = _super.call(this, type, label) || this;
            _this.addOutput(new ionode_1.IONode("output"));
            return _this;
        }
        return ConstantGate;
    }(CircuitGate));
    exports.ConstantGate = ConstantGate;
    var OneGate = (function (_super) {
        __extends(OneGate, _super);
        function OneGate() {
            var _this = _super.call(this, "BUILTIN_ONE", "1") || this;
            _this.outputNodes[0].value = 1;
            return _this;
        }
        OneGate.prototype.clone = function () {
            return new OneGate();
        };
        return OneGate;
    }(ConstantGate));
    exports.OneGate = OneGate;
    var ZeroGate = (function (_super) {
        __extends(ZeroGate, _super);
        function ZeroGate() {
            var _this = _super.call(this, "BUILTIN_ZERO", "0") || this;
            _this.outputNodes[0].value = 0;
            return _this;
        }
        ZeroGate.prototype.clone = function () {
            return new ZeroGate();
        };
        return ZeroGate;
    }(ConstantGate));
    exports.ZeroGate = ZeroGate;
    var NOTGate = (function (_super) {
        __extends(NOTGate, _super);
        function NOTGate() {
            var _this = _super.call(this, "BUILTIN_NOT", "NOT") || this;
            _this.addInput(new ionode_1.IONode("input"));
            _this.addOutput(new ionode_1.IONode("output"));
            return _this;
        }
        NOTGate.prototype.nodeFn = function () {
            if (this.inputNodes[0].value === ionode_1.IONode.NO_VALUE) {
                this.outputNodes[0].value = ionode_1.IONode.NO_VALUE;
            }
            else {
                this.outputNodes[0].value = this.inputNodes[0].value ^ 1;
            }
        };
        NOTGate.prototype.clone = function () {
            return new NOTGate();
        };
        return NOTGate;
    }(CircuitGate));
    exports.NOTGate = NOTGate;
    var OpGate = (function (_super) {
        __extends(OpGate, _super);
        function OpGate(type, label) {
            var _this = _super.call(this, type, label) || this;
            _this.addInput(new ionode_1.IONode("input1"));
            _this.addInput(new ionode_1.IONode("input2"));
            _this.addOutput(new ionode_1.IONode("output"));
            return _this;
        }
        OpGate.prototype.nodeFn = function () {
            if (this.inputNodes[0].value !== ionode_1.IONode.NO_VALUE
                && this.inputNodes[1].value !== ionode_1.IONode.NO_VALUE) {
                this.outputNodes[0].value = this.gateFn();
            }
            else {
                this.outputNodes[0].value = ionode_1.IONode.NO_VALUE;
                this.outputNodes[0].propagate();
            }
        };
        OpGate.prototype.gateFn = function () {
            return -1;
        };
        OpGate.prototype.serializeCircuit = function () {
            throw "YOU CAN'T SERIALIZE AN OPGATE LIKE A CIRCUIT STUPID DUMB DUMB!!";
        };
        return OpGate;
    }(CircuitGate));
    exports.OpGate = OpGate;
    var ANDGate = (function (_super) {
        __extends(ANDGate, _super);
        function ANDGate() {
            return _super.call(this, "BUILTIN_AND", "AND") || this;
        }
        ANDGate.prototype.gateFn = function () {
            return this.inputNodes[0].value & this.inputNodes[1].value;
        };
        ANDGate.prototype.clone = function () {
            return new ANDGate();
        };
        return ANDGate;
    }(OpGate));
    exports.ANDGate = ANDGate;
    var ORGate = (function (_super) {
        __extends(ORGate, _super);
        function ORGate() {
            return _super.call(this, "BUILTIN_OR", "OR") || this;
        }
        ORGate.prototype.gateFn = function () {
            return this.inputNodes[0].value | this.inputNodes[1].value;
        };
        ORGate.prototype.clone = function () {
            return new ORGate();
        };
        return ORGate;
    }(OpGate));
    exports.ORGate = ORGate;
    var NANDGate = (function (_super) {
        __extends(NANDGate, _super);
        function NANDGate() {
            return _super.call(this, "BUILTIN_NAND", "NAND") || this;
        }
        NANDGate.prototype.gateFn = function () {
            return (this.inputNodes[0].value & this.inputNodes[1].value) ^ 1;
        };
        NANDGate.prototype.clone = function () {
            return new NANDGate();
        };
        return NANDGate;
    }(OpGate));
    exports.NANDGate = NANDGate;
    var NORGate = (function (_super) {
        __extends(NORGate, _super);
        function NORGate() {
            return _super.call(this, "BUILTIN_NOR", "NOR") || this;
        }
        NORGate.prototype.gateFn = function () {
            return (this.inputNodes[0].value | this.inputNodes[1].value) ^ 1;
        };
        NORGate.prototype.clone = function () {
            return new NORGate();
        };
        return NORGate;
    }(OpGate));
    exports.NORGate = NORGate;
    var XORGate = (function (_super) {
        __extends(XORGate, _super);
        function XORGate() {
            return _super.call(this, "BUILTIN_XOR", "XOR") || this;
        }
        XORGate.prototype.gateFn = function () {
            return this.inputNodes[0].value ^ this.inputNodes[1].value;
        };
        XORGate.prototype.clone = function () {
            return new XORGate();
        };
        return XORGate;
    }(OpGate));
    exports.XORGate = XORGate;
    var NXORGate = (function (_super) {
        __extends(NXORGate, _super);
        function NXORGate() {
            return _super.call(this, "BUILTIN_NXOR", "NXOR") || this;
        }
        NXORGate.prototype.gateFn = function () {
            return (this.inputNodes[0].value ^ this.inputNodes[1].value) ^ 1;
        };
        NXORGate.prototype.clone = function () {
            return new NXORGate();
        };
        return NXORGate;
    }(OpGate));
    exports.NXORGate = NXORGate;
    var ShallowGate = (function (_super) {
        __extends(ShallowGate, _super);
        function ShallowGate(label, numInputs, numOutputs) {
            var _this = _super.call(this, "shallow", label) || this;
            for (var i = 0; i < numInputs; i++) {
                _this.inputNodes.push(new ionode_1.IONode(""));
            }
            for (var i = 0; i < numOutputs; i++) {
                _this.outputNodes.push(new ionode_1.IONode(""));
            }
            return _this;
        }
        ShallowGate.prototype.serializeCircuit = function () {
            throw "DON'T SERIALIZE A SHALLOW GATE WTF!!!";
        };
        return ShallowGate;
    }(CircuitGate));
    exports.ShallowGate = ShallowGate;
});
