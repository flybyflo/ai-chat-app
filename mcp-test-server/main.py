from fastmcp import FastMCP
from typing import Union
import math
import sys

# Initialize the FastMCP agent with a name and description
mcp = FastMCP(
    "Calculator Pro 🔢",
    "A versatile calculator that can perform addition, subtraction, multiplication, division, exponentiation, square roots, modulo, and trigonometric operations."
)

# Define constants for integer limits
INT_MIN = -sys.maxsize - 1
INT_MAX = sys.maxsize
FLOAT_MIN = -1.7976931348623157e+308
FLOAT_MAX = 1.7976931348623157e+308

def check_integer_bounds(value: int, operation: str) -> Union[int, str]:
    """
    Checks if an integer value is within acceptable bounds.
    
    :param value: The integer value to check.
    :param operation: The operation being performed (for error message).
    :return: The value if within bounds, or an error message.
    """
    if value < INT_MIN:
        return f"Error: Underflow occurred in {operation}. Result is too small."
    if value > INT_MAX:
        return f"Error: Overflow occurred in {operation}. Result is too large."
    return value

def check_float_bounds(value: float, operation: str) -> Union[float, str]:
    """
    Checks if a float value is within acceptable bounds.
    
    :param value: The float value to check.
    :param operation: The operation being performed (for error message).
    :return: The value if within bounds, or an error message.
    """
    if value == float('-inf'):
        return f"Error: Underflow occurred in {operation}. Result is too small."
    if value == float('inf'):
        return f"Error: Overflow occurred in {operation}. Result is too large."
    return value

@mcp.tool
def add(a: int, b: int) -> Union[int, str]:
    """
    Adds two integer numbers together.

    :param a: The first number.
    :param b: The second number.
    :return: The sum of the two numbers.
    """
    print(f"Adding {a} + {b}")
    try:
        result = a + b
        return check_integer_bounds(result, "addition")
    except OverflowError:
        return "Error: Overflow occurred in addition. Result is too large."

@mcp.tool
def subtract(a: int, b: int) -> Union[int, str]:
    """
    Subtracts the second number from the first number.

    :param a: The first number (minuend).
    :param b: The second number (subtrahend).
    :return: The difference between the two numbers.
    """
    print(f"Subtracting {a} - {b}")
    try:
        result = a - b
        return check_integer_bounds(result, "subtraction")
    except OverflowError:
        return "Error: Overflow occurred in subtraction. Result is too large."

@mcp.tool
def multiply(a: int, b: int) -> Union[int, str]:
    """
    Multiplies two integer numbers.

    :param a: The first number.
    :param b: The second number.
    :return: The product of the two numbers.
    """
    print(f"Multiplying {a} * {b}")
    try:
        result = a * b
        return check_integer_bounds(result, "multiplication")
    except OverflowError:
        return "Error: Overflow occurred in multiplication. Result is too large."

@mcp.tool
def divide(numerator: float, denominator: float) -> Union[float, str]:
    """
    Divides the numerator by the denominator.

    :param numerator: The number to be divided.
    :param denominator: The number to divide by.
    :return: The result of the division, or an error message if division by zero occurs.
    """
    print(f"Dividing {numerator} / {denominator}")
    if denominator == 0:
        return "Error: Cannot divide by zero."
    try:
        result = numerator / denominator
        return check_float_bounds(result, "division")
    except OverflowError:
        return "Error: Overflow occurred in division."

@mcp.tool
def power(base: float, exponent: float) -> Union[float, str]:
    """
    Raises a number to the power of an exponent.

    :param base: The base number.
    :param exponent: The exponent.
    :return: The result of the exponentiation.
    """
    print(f"Calculating {base} ^ {exponent}")
    try:
        result = math.pow(base, exponent)
        return check_float_bounds(result, "exponentiation")
    except OverflowError:
        return "Error: Overflow occurred in exponentiation. Result is too large."

@mcp.tool
def square_root(number: float) -> Union[float, str]:
    """
    Calculates the square root of a number.

    :param number: The number to find the square root of.
    :return: The square root of the number, or an error message for negative input.
    """
    print(f"Calculating square root of {number}")
    if number < 0:
        return "Error: Cannot calculate the square root of a negative number."
    try:
        return math.sqrt(number)
    except OverflowError:
        return "Error: Overflow occurred in square root calculation."

@mcp.tool
def modulo(a: int, b: int) -> Union[int, str]:
    """
    Calculates the remainder of a division.

    :param a: The dividend.
    :param b: The divisor.
    :return: The remainder.
    """
    print(f"Calculating {a} % {b}")
    if b == 0:
        return "Error: Cannot perform modulo with zero divisor."
    try:
        return a % b
    except OverflowError:
        return "Error: Overflow occurred in modulo operation."

@mcp.tool
def sine(angle_degrees: float) -> Union[float, str]:
    """
    Calculates the sine of an angle.

    :param angle_degrees: The angle in degrees.
    :return: The sine of the angle.
    """
    print(f"Calculating sin({angle_degrees}°)")
    try:
        angle_radians = math.radians(angle_degrees)
        result = math.sin(angle_radians)
        return check_float_bounds(result, "sine calculation")
    except OverflowError:
        return "Error: Overflow occurred in sine calculation."

@mcp.tool
def cosine(angle_degrees: float) -> Union[float, str]:
    """
    Calculates the cosine of an angle.

    :param angle_degrees: The angle in degrees.
    :return: The cosine of the angle.
    """
    print(f"Calculating cos({angle_degrees}°)")
    try:
        angle_radians = math.radians(angle_degrees)
        result = math.cos(angle_radians)
        return check_float_bounds(result, "cosine calculation")
    except OverflowError:
        return "Error: Overflow occurred in cosine calculation."

@mcp.tool
def tangent(angle_degrees: float) -> Union[float, str]:
    """
    Calculates the tangent of an angle.

    :param angle_degrees: The angle in degrees.
    :return: The tangent of the angle.
    """
    print(f"Calculating tan({angle_degrees}°)")
    try:
        angle_radians = math.radians(angle_degrees)
        result = math.tan(angle_radians)
        return check_float_bounds(result, "tangent calculation")
    except OverflowError:
        return "Error: Overflow occurred in tangent calculation."
    except ValueError:
        return "Error: Invalid input for tangent calculation."


if __name__ == "__main__":
    # This block allows the script to be run directly.
    # FastMCP will start an interactive session where you can call the tools.
    print("Calculator Pro is ready! You can now ask it to perform calculations.")
    print("For example: 'add 5 and 3', 'what is the cosine of 60 degrees?', or 'what is the square root of 16?'")
    mcp.run()
