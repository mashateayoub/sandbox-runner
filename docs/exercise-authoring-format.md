# Exercise Authoring Format (Sandbox Runner)

This guide defines how coding exercises must be written so submissions can be graded correctly with test cases.

## 1) Core Contract
Every solution must:
- read input from **stdin**
- write final answer to **stdout**
- avoid extra logging/debug output
- be deterministic (no randomness/network/time-based output)

The grader compares `actual` vs `expectedOutput` after `trim()`.

## 2) Input/Output Rules
For each exercise, define clearly:
- **Input format**: line-by-line or token-by-token structure
- **Output format**: exact expected printed value(s)

### Important
- Keep output exact (case, spacing, line breaks inside content).
- Do not print prompts like `Enter n:`.
- Do not include explanation text in output.

## 3) Test Case Object Format
Each test case sent by platform should follow:

```json
{
  "label": "optional human-readable name",
  "input": "raw stdin text",
  "expectedOutput": "exact expected stdout"
}
```

Example payload:

```json
{
  "code": "n = int(input())\nprint(n*2)",
  "language": "python",
  "testCases": [
    { "label": "basic", "input": "5", "expectedOutput": "10" },
    { "label": "zero", "input": "0", "expectedOutput": "0" }
  ]
}
```

## 4) Exercise Design Recommendations
- Include edge cases (`0`, negatives, empty input where relevant, max constraints).
- Keep test input consistent with statement constraints.
- Prefer one canonical output format.
- If multiple valid formats exist, normalize in problem statement to one required format.

## 5) Language Templates (Starter Style)

## Python
```python
import sys

def main():
    data = sys.stdin.read().strip().split()
    # parse data
    # compute result
    print(result)

if __name__ == "__main__":
    main()
```

## JavaScript (Node)
```javascript
const fs = require("fs");
const data = fs.readFileSync(0, "utf8").trim().split(/\s+/);
// parse data
// compute result
console.log(result);
```

## Java
```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    String line;
    while ((line = br.readLine()) != null) {
      sb.append(line).append("\n");
    }
    String input = sb.toString().trim();
    // parse input
    // compute result
    System.out.println(result);
  }
}
```

## C++
```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // read from cin
    // compute result
    cout << result << "\n";
    return 0;
}
```

## Go
```go
package main

import (
  "bufio"
  "fmt"
  "os"
)

func main() {
  in := bufio.NewReader(os.Stdin)
  // read input
  // compute result
  fmt.Println(result)
  _ = in
}
```

## Rust
```rust
use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let input = input.trim();
    // parse input
    // compute result
    println!("{}", result);
}
```

## 6) Common Failure Causes
- Hardcoded values instead of stdin parsing.
- Extra prints (`debug`, prompts, logs).
- Wrong delimiter handling (spaces vs lines).
- Floating-point formatting mismatch.
- Non-deterministic output.

## 7) Author Checklist (Before Publishing an Exercise)
- Statement includes exact input format.
- Statement includes exact output format.
- Sample input/output matches parser expectations.
- Hidden tests include edge cases.
- Starter code uses stdin/stdout correctly.
- Expected output strings are strict and consistent.

Following this format ensures exercise test cases run and grade reliably on `sandbox-runner`.
