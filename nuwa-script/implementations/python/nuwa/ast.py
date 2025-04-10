import dataclasses
from typing import Any, Dict, List, Optional, Union

# Base node
@dataclasses.dataclass
class Node:
    """Base class for all AST nodes."""
    pass

# Expressions
@dataclasses.dataclass
class Expression(Node):
    """Base class for all expression nodes."""
    pass

@dataclasses.dataclass
class Literal(Expression):
    """Represents literal values like numbers, strings, booleans."""
    value: Union[int, float, str, bool, None]

@dataclasses.dataclass
class Variable(Expression):
    """Represents a variable identifier."""
    name: str

@dataclasses.dataclass
class BinaryOp(Expression):
    """Represents a binary operation (e.g., price > 70000, a AND b)."""
    operator: str  # e.g., "==", "!=", ">", "<", ">=", "<=", "AND", "OR"
    left: Expression
    right: Expression

@dataclasses.dataclass
class UnaryOp(Expression):
    """Represents a unary operation (e.g., NOT condition)."""
    operator: str # e.g., "NOT"
    operand: Expression

@dataclasses.dataclass
class FunctionCall(Expression):
    """Represents a built-in function call (e.g., NOW())."""
    function_name: str
    # Currently no arguments for NOW(), but might need in future
    # arguments: List[Expression] = dataclasses.field(default_factory=list)

@dataclasses.dataclass
class CallExpression(Expression):
    """Represents a tool call used as an expression (e.g., in LET)."""
    tool_name: str
    arguments: Dict[str, Expression]

@dataclasses.dataclass
class CalcExpression(Expression):
    """Represents a CALC block."""
    formula: str
    variables: Dict[str, Expression]


# Statements
@dataclasses.dataclass
class Statement(Node):
    """Base class for all statement nodes."""
    pass

@dataclasses.dataclass
class LetStatement(Statement):
    """Represents a LET statement."""
    variable_name: str
    value: Expression # Can be Literal, Variable, CallExpression, CalcExpression, etc.

@dataclasses.dataclass
class CallStatement(Statement):
    """Represents a CALL statement."""
    tool_name: str
    arguments: Dict[str, Expression]

@dataclasses.dataclass
class IfStatement(Statement):
    """Represents an IF statement."""
    condition: Expression
    then_block: List[Statement]
    else_block: Optional[List[Statement]] = None # ELSE block is optional

@dataclasses.dataclass
class ForStatement(Statement):
    """Represents a FOR statement."""
    iterator_variable: str
    iterable: Expression # The list/collection to iterate over
    loop_block: List[Statement]

@dataclasses.dataclass
class Script(Node):
    """Represents the entire script (a list of statements)."""
    statements: List[Statement]
