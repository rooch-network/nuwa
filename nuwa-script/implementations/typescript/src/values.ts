// Defines the possible types of values during NuwaScript execution.
export type NuwaValue =
  | string
  | number // Use standard JavaScript number type (IEEE 754 double)
  | boolean
  | null
  | NuwaValue[] // Represents lists/arrays
  | NuwaObject; // Represents objects/maps

// Explicit type for NuwaScript objects for clarity
export type NuwaObject = { [key: string]: NuwaValue };

// --- Type Checking Helper Functions ---

export function isNuwaObject(value: NuwaValue): value is NuwaObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNuwaList(value: NuwaValue): value is NuwaValue[] {
  return Array.isArray(value);
}

export function isNuwaString(value: NuwaValue): value is string {
  return typeof value === 'string';
}

export function isNuwaNumber(value: NuwaValue): value is number {
  return typeof value === 'number';
}

export function isNuwaBoolean(value: NuwaValue): value is boolean {
  return typeof value === 'boolean';
}

export function isNuwaNull(value: NuwaValue): value is null {
    return value === null;
}

// --- Equality Comparison ---
// Handles nested structures. Be cautious with circular references if they become possible.
export function nuwaValuesAreEqual(v1: NuwaValue, v2: NuwaValue): boolean {
  if (v1 === v2) {
    return true; // Handles primitives and null comparison, plus same object reference
  }

  if (typeof v1 !== typeof v2) {
    return false; // Different types
  }

  if (v1 === null || v2 === null) {
      return v1 === v2; // Already covered by === but explicit
  }

  if (isNuwaList(v1) && isNuwaList(v2)) {
    if (v1.length !== v2.length) {
      return false;
    }
    for (let i = 0; i < v1.length; i++) {
      if (!nuwaValuesAreEqual(v1[i]!, v2[i]!)) {
        return false;
      }
    }
    return true;
  }

  if (isNuwaObject(v1) && isNuwaObject(v2)) {
    const keys1 = Object.keys(v1);
    const keys2 = Object.keys(v2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (const key of keys1) {
      if (!keys2.includes(key) || !nuwaValuesAreEqual(v1[key]!, v2[key]!)) {
        return false;
      }
    }
    return true;
  }

  // Fallback for any other case (shouldn't happen with exhaustive checks above)
  return false;
}

// --- String Representation (for PRINT or debugging) ---
// Allow undefined as input, return e.g., "undefined" or empty string?
// Let's return "undefined" for consistency, though null returns "NULL".
export function nuwaValueToString(value: NuwaValue | undefined): string {
    if (value === undefined) {
        return 'undefined'; // Or perhaps '' based on desired behavior?
    }
    if (value === null) {
        return 'NULL';
    }
    if (typeof value === 'string') {
        return value; // Return string directly
    }
    if (typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE'; // Use uppercase literals?
    }
    if (isNuwaList(value)) {
        // Recursive call for list elements
        const listItems = value.map(item => nuwaValueToString(item));
        return `[${listItems.join(', ')}]`;
    }
    if (isNuwaObject(value)) {
        // Recursive call for object values
        const objectEntries = Object.entries(value)
            .map(([key, val]) => `${key}: ${nuwaValueToString(val)}`); // Assuming keys are simple strings
        return `{${objectEntries.join(', ')}}`;
    }

    // Fallback for any unexpected case (should be unreachable given type definition)
    const exhaustiveCheck: never = value;
    return `[Unknown NuwaValue: ${exhaustiveCheck}]`;
}
