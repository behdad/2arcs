class Complex {
    constructor(real, imag) {
	this.real = real;
	this.imag = imag;
    }

    add(other) {
	return new Complex(this.real + other.real, this.imag + other.imag);
    }

    subtract(other) {
	return new Complex(this.real - other.real, this.imag - other.imag);
    }

    multiply(other) {
	return new Complex(
	    this.real * other.real - this.imag * other.imag,
	    this.real * other.imag + this.imag * other.real
	);
    }

    divide(other) {
	const denom = other.real * other.real + other.imag * other.imag;
	return new Complex(
	    (this.real * other.real + this.imag * other.imag) / denom,
	    (this.imag * other.real - this.real * other.imag) / denom
	);
    }

    abs() {
	return Math.sqrt(this.real * this.real + this.imag * this.imag);
    }

    negate() {
	return new Complex(-this.real, -this.imag);
    }

    scale(s) {
	return new Complex(this.real * s, this.imag * s);
    }

    sqrt() {
	const r = Math.sqrt(this.abs());
	const theta = Math.atan2(this.imag, this.real) / 2;
	return new Complex(r * Math.cos(theta), r * Math.sin(theta));
    }
}

function dot(a, b) {
    return a.real * b.real + a.imag * b.imag;
}

function cross(a, b) {
    return a.real * b.imag - a.imag * b.real;
}

function normalize(d) {
    return d.scale(1 / d.abs());
}

function linesIntersection(p0, d0, p1, d1) {
    const c = cross(d0, d1);
    if (Math.abs(c) < 1e-6) {
	return null;
    }
    const t = cross(d1, p0.subtract(p1)) / c;
    return p0.add(d0.multiply(new Complex(t, 0)));
}

function lines2ArcConnection(l0, l1, shortest = true, t = 1) {
    const rotate90 = new Complex(0, 1);
    let connection = normalize(l1[0].subtract(l0[1]));
    const d0 = normalize(l0[1].subtract(l0[0]));
    const d1 = normalize(l1[1].subtract(l1[0]));
    let connection0, connection1;
    let c0, c1;
    let r0, r1;
    let arc0, arc1;
    let arcsMeetingPoint;

    let xs = []
    /* We use two algorithms.
     * Collect both solutions and pick the best one. */

    // Algorithm 0
    {
	const p0 = l0[1];
	const p1 = l1[0];

	const a = d1.subtract(d0.multiply(new Complex(t, 0)));
	const b = new Complex(-2, 0).multiply(d1.multiply(p0).subtract(d0.multiply(p1).multiply(new Complex(t, 0))));
	const c = d1.multiply(p0).multiply(p0).subtract(d0.multiply(p1).multiply(p1).multiply(new Complex(t, 0)));

	if (a.abs()) {
	    const delta = b.multiply(b).subtract(a.multiply(c).scale(4));
	    const delta_sqrt = delta.sqrt();
	    const x0 = b.negate().add(delta_sqrt).divide(a.scale(2));
	    if (shortest)
		xs.push(x0);
	    const x1 = b.negate().subtract(delta_sqrt).divide(a.scale(2));
	    xs.push(x1);
	} else {
	    const x = c.negate().divide(b);
	    xs.push(x);
	}

    }
    // Algorithm 1
    {
	const d0r = d0.add(connection);
	const d1r = d1.add(connection);

	const x = linesIntersection(l0[1], d0r, l1[0], d1r);
	if (x !== null)
	    xs.push(x);
    }
    let best_score = 0;
    let score;
    for (let i = 0; i < xs.length; i++) {
	x = xs[i];
	const v = normalize(x.subtract(l0[1]));
	connection = v.multiply(v).divide(d0);

	const connectionNormal = connection.multiply(rotate90);
	const c0 = linesIntersection(l0[1], d0.multiply(rotate90), x, connectionNormal);
	const c1 = linesIntersection(l1[0], d1.multiply(rotate90), x, connectionNormal);
	const r0 = c0 ? c0.subtract(x).abs() : null;
	const r1 = c1 ? c1.subtract(x).abs() : null;

	let theta01 = Math.atan2(x.imag - c0.imag, x.real - c0.real);
	let theta02 = Math.atan2(l0[1].imag - c0.imag, l0[1].real - c0.real);
	if (dot(d0, c0.subtract(l0[1]).multiply(rotate90)) < 0)
	    [theta01, theta02] = [theta02, theta01];
	if (theta02 < theta01)
	    theta02 += 2 * Math.PI;

	let theta11 = Math.atan2(l1[0].imag - c1.imag, l1[0].real - c1.real);
	let theta12 = Math.atan2(x.imag - c1.imag, x.real - c1.real);
	if (dot(d1, c1.subtract(l1[0]).multiply(rotate90)) < 0)
	    [theta11, theta12] = [theta12, theta11];
	if (theta12 < theta11)
	    theta12 += 2 * Math.PI;

	score = (theta02 - theta01) * r0 + (theta12 - theta11) * r1;
	if (i == 0 || score < best_score) {
	    arc0 = { center: c0, radius: r0, startAngle: theta01, endAngle: theta02 };
	    arc1 = { center: c1, radius: r1, startAngle: theta11, endAngle: theta12 };
	    arcsMeetingPoint = x;
	    best_score = score;
	}
    }

    // Before returning, check for NaN in your results
    if (isNaN(arc0.radius) || isNaN(arc0.startAngle) || isNaN(arc0.endAngle)) {
	console.error("Invalid arc0 parameters", arc0);
    }
    if (isNaN(arc1.radius) || isNaN(arc1.startAngle) || isNaN(arc1.endAngle)) {
	console.error("Invalid arc1 parameters", arc1);
    }

    return {
	arc0: arc0,
	arc1: arc1,
	meetingPoint: arcsMeetingPoint
    };
}
