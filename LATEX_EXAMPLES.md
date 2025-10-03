# LaTeX Math Rendering Examples - Quick Reference

## 🎯 How to Use

Simply include LaTeX expressions in your question text using `$...$` for inline math or `$$...$$` for display (centered) math.

---

## 📚 Common Math Examples

### Basic Algebra

| LaTeX Code      | What It Renders                    |
| --------------- | ---------------------------------- |
| `$x^2$`         | x² (x squared)                     |
| `$x_1$`         | x₁ (x subscript 1)                 |
| `$x^{2n}$`      | x²ⁿ (x to the power 2n)            |
| `$\frac{a}{b}$` | a/b (fraction with horizontal bar) |
| `$\sqrt{x}$`    | √x (square root)                   |
| `$\sqrt[3]{x}$` | ³√x (cube root)                    |

### Quadratic Formula

```
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
```

Renders as a beautiful centered equation with proper fraction bar and square root.

### Calculus

| LaTeX Code           | What It Renders               |
| -------------------- | ----------------------------- |
| `$\int f(x) dx$`     | Integral of f(x)              |
| `$\int_a^b f(x) dx$` | Definite integral from a to b |
| `$\frac{dy}{dx}$`    | Derivative dy/dx              |
| `$f'(x)$`            | f prime of x                  |
| `$\lim_{x \to 0}$`   | Limit as x approaches 0       |

### Integral Example

```
$$\int_0^\pi \sin(x) \, dx = 2$$
```

### Derivative Example

```
$$\frac{d}{dx}(x^3) = 3x^2$$
```

### Greek Letters

| LaTeX Code | Symbol            |
| ---------- | ----------------- |
| `$\alpha$` | α (alpha)         |
| `$\beta$`  | β (beta)          |
| `$\gamma$` | γ (gamma)         |
| `$\delta$` | δ (delta)         |
| `$\theta$` | θ (theta)         |
| `$\pi$`    | π (pi)            |
| `$\sigma$` | σ (sigma)         |
| `$\omega$` | ω (omega)         |
| `$\Sigma$` | Σ (capital Sigma) |
| `$\Delta$` | Δ (capital Delta) |

### Summation and Products

```
$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$
```

```
$$\prod_{i=1}^{n} i = n!$$
```

### Matrices

```
$$\begin{pmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{pmatrix}$$
```

### Trigonometry

| LaTeX Code  | Function  |
| ----------- | --------- |
| `$\sin(x)$` | sine      |
| `$\cos(x)$` | cosine    |
| `$\tan(x)$` | tangent   |
| `$\sec(x)$` | secant    |
| `$\csc(x)$` | cosecant  |
| `$\cot(x)$` | cotangent |

### Pythagorean Identity

```
$$\sin^2(x) + \cos^2(x) = 1$$
```

### Set Theory

| LaTeX Code        | Symbol/Meaning          |
| ----------------- | ----------------------- |
| `$\{1, 2, 3\}$`   | Set notation            |
| `$x \in A$`       | x is element of A       |
| `$A \subseteq B$` | A is subset of B        |
| `$A \cup B$`      | Union of A and B        |
| `$A \cap B$`      | Intersection of A and B |
| `$\emptyset$`     | Empty set               |

### Logic Symbols

| LaTeX Code   | Symbol/Meaning |
| ------------ | -------------- |
| `$\forall$`  | For all        |
| `$\exists$`  | There exists   |
| `$\neg$`     | Not            |
| `$\land$`    | And            |
| `$\lor$`     | Or             |
| `$\implies$` | Implies        |
| `$\iff$`     | If and only if |

### Comparison Operators

| LaTeX Code  | Symbol/Meaning           |
| ----------- | ------------------------ |
| `$\leq$`    | Less than or equal to    |
| `$\geq$`    | Greater than or equal to |
| `$\neq$`    | Not equal to             |
| `$\approx$` | Approximately equal      |
| `$\equiv$`  | Equivalent to            |
| `$\pm$`     | Plus or minus            |

---

## 🔬 Complete Question Examples

### Example 1: Algebra Question

```
**Question Title:** Solve the quadratic equation

**Question Body:**
Find all values of $x$ that satisfy the equation $x^2 - 5x + 6 = 0$.

Use the quadratic formula: $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

where $a = 1$, $b = -5$, and $c = 6$.
```

### Example 2: Calculus Question

```
**Question Title:** Evaluate the definite integral

**Question Body:**
Calculate the value of:
$$\int_0^1 x^2 \, dx$$

Show all steps in your solution.
```

### Example 3: Trigonometry Question

```
**Question Title:** Prove the trigonometric identity

**Question Body:**
Prove that: $$\frac{1 - \cos(2x)}{\sin(2x)} = \tan(x)$$

Use the double angle formulas:
- $\sin(2x) = 2\sin(x)\cos(x)$
- $\cos(2x) = 1 - 2\sin^2(x)$
```

### Example 4: Physics Question

```
**Question Title:** Calculate the kinetic energy

**Question Body:**
A ball of mass $m = 2$ kg is moving with velocity $v = 10$ m/s.

Calculate its kinetic energy using the formula:
$$KE = \frac{1}{2}mv^2$$

Express your answer in Joules (J).
```

### Example 5: Statistics Question

```
**Question Title:** Find the standard deviation

**Question Body:**
Given a dataset with mean $\mu$ and variance $\sigma^2$, the standard deviation is:
$$\sigma = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(x_i - \mu)^2}$$

Calculate $\sigma$ for the dataset: $\{2, 4, 6, 8, 10\}$
```

---

## 🎨 Inline vs Display Math

### Inline Math (use `$...$`)

Use for small expressions within sentences:

```
The area of a circle with radius $r$ is $A = \pi r^2$.
```

### Display Math (use `$$...$$`)

Use for important equations that should stand out:

```
The fundamental theorem of calculus states:
$$\int_a^b f'(x) \, dx = f(b) - f(a)$$
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ Wrong: Missing braces

```
$x^2n$  // Renders as x² n (incorrect)
```

### ✅ Correct: With braces

```
$x^{2n}$  // Renders as x²ⁿ (correct)
```

### ❌ Wrong: Nested dollar signs

```
$$x = $\frac{1}{2}$$  // Invalid - don't nest $ inside $$
```

### ✅ Correct: No nesting

```
$$x = \frac{1}{2}$$
```

### ❌ Wrong: Forgetting backslashes

```
$sin(x)$  // Renders as "sin(x)" in italics (incorrect)
```

### ✅ Correct: With backslash

```
$\sin(x)$  // Renders with proper function formatting
```

---

## 🚀 Quick Copy-Paste Templates

### Template 1: Multiple Choice with Math

```json
{
  "title": "What is the derivative of $f(x) = x^3$?",
  "body": "Choose the correct answer:\na) $f'(x) = x^2$\nb) $f'(x) = 3x^2$\nc) $f'(x) = 3x$\nd) $f'(x) = x^3$",
  "type": "multiple-choice",
  "correctAnswer": "b"
}
```

### Template 2: Descriptive with Formula

```json
{
  "title": "Prove the Pythagorean theorem",
  "body": "For a right triangle with sides $a$, $b$, and hypotenuse $c$, prove that:\n$$a^2 + b^2 = c^2$$\n\nProvide a detailed geometric proof.",
  "type": "descriptive"
}
```

### Template 3: Numerical Problem

```json
{
  "title": "Calculate the limit",
  "body": "Evaluate the following limit:\n$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$$\n\nShow all steps in your solution.",
  "type": "numerical"
}
```

---

## 📊 Testing Checklist

When testing LaTeX rendering, verify:

- [ ] Inline math (`$...$`) renders within text
- [ ] Display math (`$$...$$`) renders as centered blocks
- [ ] Superscripts show correctly (x²)
- [ ] Subscripts show correctly (x₁)
- [ ] Fractions have proper bars
- [ ] Greek letters display correctly
- [ ] Integrals and summations have proper symbols
- [ ] Invalid LaTeX shows error (red code block)
- [ ] Multiple equations in one question all render
- [ ] Math in both title and body work

---

**Pro Tip**: Use the KaTeX documentation for more advanced symbols: https://katex.org/docs/supported.html
