// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

type Style = "bold" | "dim" | "underline" | "blink" | "inverse";

const COLOR_STYLES = {
	bold: "1;",
	dim: "2;",
	underline: "4;",
	blink: "5;",
	inverse: "7;",
};

/**
 * Call these functions to wrap a string in ANSI color codes. Add `.bold`, `.dim`, `.underline`, `.blink`, or `.inverse` to the function to add the corresponding ANSI codes. String as many effects together as you like. (Note that not all terminals support all effects.)
 */
export const Colors = {
	// this brute-force approach works better with IDE code completion than building the object at run-time.
	black: colorFn(30),
	red: colorFn(31),
	green: colorFn(32),
	yellow: colorFn(33),
	blue: colorFn(34),
	purple: colorFn(35),
	cyan: colorFn(36),
	white: colorFn(37),
	brightBlack: colorFn(90),
	brightRed: colorFn(91),
	brightGreen: colorFn(92),
	brightYellow: colorFn(93),
	brightBlue: colorFn(94),
	brightPurple: colorFn(95),
	brightCyan: colorFn(96),
	brightWhite: colorFn(97),
};

export interface ColorFn {
	(name: string): string;
	bold: ColorFn;
	dim: ColorFn;
	underline: ColorFn;
	blink: ColorFn;
	inverse: ColorFn;
}

function colorFn(color: number): ColorFn {
	const fn = encodeFn("", color);
	combinatorialize(fn, "", color, COLOR_STYLES);
	return fn;

	function encodeFn(style: string, color: number) {
		return ((text: string) => `\u001b[${style}${color}m${text}\u001b[0m`) as ColorFn;
	}

	function combinatorialize(fn: ColorFn, baseStyle: string, color: number, styles: Record<Style, string>) {
		// adds .bold, .dim, etc. to fn, and does so recursively.
		const styleNames = Object.keys(styles) as Style[];
		styleNames.forEach((styleKey) => {
			const myStyle = baseStyle + styles[styleKey];
			fn[styleKey] = encodeFn(myStyle, color);

			const remainingStyles = { ...styles };
			delete remainingStyles[styleKey];
			combinatorialize(fn[styleKey], myStyle, color, remainingStyles);
		});
	}
}
