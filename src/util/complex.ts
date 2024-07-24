import { Vector3 } from './vector';

export class Complex {
  constructor(public real: number, public imaginary: number = 0) {}

  static fromDouble(real: number): Complex {
    return new Complex(real);
  }

  static complexExp(c: Complex): Complex {
    return Complex.exp({ angle: c.imaginary, r: Math.exp(c.real) });
  }

  static exp({ r = 1, angle }: { r?: number; angle: number }): Complex {
    return new Complex(r * Math.cos(angle), r * Math.sin(angle));
  }

  equals(other: Complex | number): boolean {
    if (other instanceof Complex) {
      return this.real === other.real && this.imaginary === other.imaginary;
    } else if (typeof other === 'number') {
      return this.real === other && this.imaginary === 0;
    }
    return false;
  }

  add(other: Complex): Complex {
    return new Complex(
      this.real + other.real,
      this.imaginary + other.imaginary
    );
  }

  subtract(other: Complex): Complex {
    return this.add(other.scale(-1));
  }

  multiply(other: Complex): Complex {
    return new Complex(
      this.real * other.real - this.imaginary * other.imaginary,
      this.real * other.imaginary + this.imaginary * other.real
    );
  }

  divide(other: Complex): Complex {
    if (other.equals(0)) {
      throw new Error('Division by zero');
    }

    const a = this.real;
    const b = this.imaginary;
    const c = other.real;
    const d = other.imaginary;

    return new Complex(
      (a * c + b * d) / (c * c + d * d),
      (b * c - a * d) / (c * c + d * d)
    );
  }

  scale(k: number): Complex {
    return this.multiply(Complex.fromDouble(k));
  }

  conjugate(): Complex {
    return new Complex(this.real, -this.imaginary);
  }

  normSquared(): number {
    return this.real * this.real + this.imaginary * this.imaginary;
  }

  norm(): number {
    return Math.sqrt(this.normSquared());
  }

  normalize(): Complex {
    return this.divide(Complex.fromDouble(this.norm()));
  }

  copy(): Complex {
    return new Complex(this.real, this.imaginary);
  }

  toVector3(z: number = 0): Vector3 {
    return new Vector3(this.real, this.imaginary, z);
  }

  angle(): number {
    if (this.real === 0 && this.imaginary === 0) {
      return 0;
    }
    return Math.atan2(this.imaginary, this.real);
  }

  pow(k: number): Complex {
    if (Number.isInteger(k)) {
      return Array(k)
        .fill(this)
        .reduce((a, b) => a.multiply(b));
    } else if (typeof k === 'number') {
      const angle = this.angle();
      const mag = this.norm();

      const newAngle = angle * k;
      const newMag = Math.pow(mag, k);

      return Complex.exp({ angle: newAngle, r: newMag });
    } else {
      throw new Error(`Unhandled power operation for type ${typeof k}`);
    }
  }
}
