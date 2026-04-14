window.DiceCanvas = (function () {

    const BASE_ROTATION_X = -35;

    const BASE_ROTATION_Y = 45;

    const DURATION_MS = 900;

    const PERSPECTIVE = 8.25;

    const CUBE_HALF = 0.5;

    const DEFAULT_EDGE = '#151515';

    const STYLE_PRESETS = {
        Neon: {
            lightMix: 0.28,
            midMix: 0.06,
            darkMix: 0.30,
            highlightAlpha: 0.26,
            sheenAlpha: 0.22,
            edgeAlpha: 1,
            pipColor: 'rgba(14, 14, 18, 0.96)'
        },
        Glass: {
            lightMix: 0.16,
            midMix: 0.04,
            darkMix: 0.48,
            highlightAlpha: 0.42,
            sheenAlpha: 0.34,
            edgeAlpha: 0.72,
            pipColor: 'rgba(8, 12, 18, 0.92)'
        },
        Chrome: {
            lightMix: 0.46,
            midMix: 0.10,
            darkMix: 0.58,
            highlightAlpha: 0.52,
            sheenAlpha: 0.48,
            edgeAlpha: 0.92,
            pipColor: 'rgba(10, 10, 12, 0.98)'
        },
        Ivory: {
            lightMix: 0.74,
            midMix: 0.18,
            darkMix: 0.20,
            highlightAlpha: 0.28,
            sheenAlpha: 0.18,
            edgeAlpha: 0.78,
            pipColor: 'rgba(42, 34, 26, 0.94)'
        }
    };

    const FACE_ROTATIONS = {
        1: { x: 0, y: 0 },
        2: { x: 90, y: 0 },
        3: { x: 0, y: 90 },
        4: { x: 0, y: -90 },
        5: { x: -90, y: 0 },
        6: { x: 0, y: 180 }
    };

    const FACE_LAYOUTS = {
        1: [{ u: 0, v: 0 }],
        2: [
            { u: -0.3285714286, v: -0.3285714286 },
            { u: 0.3285714286, v: 0.3285714286 }
        ],
        3: [
            { u: -0.3571428571, v: -0.3571428571 },
            { u: 0, v: 0 },
            { u: 0.3571428571, v: 0.3571428571 }
        ],
        4: [
            { u: -0.3571428571, v: -0.3571428571 },
            { u: 0.3571428571, v: -0.3571428571 },
            { u: -0.3571428571, v: 0.3571428571 },
            { u: 0.3571428571, v: 0.3571428571 }
        ],
        5: [
            { u: -0.3571428571, v: -0.3571428571 },
            { u: 0.3571428571, v: -0.3571428571 },
            { u: 0, v: 0 },
            { u: -0.3571428571, v: 0.3571428571 },
            { u: 0.3571428571, v: 0.3571428571 }
        ],
        6: [
            { u: -0.3571428571, v: -0.3714285714 },
            { u: 0.3571428571, v: -0.3714285714 },
            { u: -0.3571428571, v: 0 },
            { u: 0.3571428571, v: 0 },
            { u: -0.3571428571, v: 0.3714285714 },
            { u: 0.3571428571, v: 0.3714285714 }
        ]
    };

    const FACE_DEFS = [
        {
            key: 'front',
            value: 1,
            center: [0, 0, CUBE_HALF],
            u: [1, 0, 0],
            v: [0, 1, 0],
            normal: [0, 0, 1]
        },
        {
            key: 'top',
            value: 2,
            center: [0, CUBE_HALF, 0],
            u: [1, 0, 0],
            v: [0, 0, -1],
            normal: [0, 1, 0]
        },
        {
            key: 'left',
            value: 3,
            center: [-CUBE_HALF, 0, 0],
            u: [0, 0, -1],
            v: [0, 1, 0],
            normal: [-1, 0, 0]
        },
        {
            key: 'right',
            value: 4,
            center: [CUBE_HALF, 0, 0],
            u: [0, 0, 1],
            v: [0, 1, 0],
            normal: [1, 0, 0]
        },
        {
            key: 'bottom',
            value: 5,
            center: [0, -CUBE_HALF, 0],
            u: [1, 0, 0],
            v: [0, 0, 1],
            normal: [0, -1, 0]
        },
        {
            key: 'back',
            value: 6,
            center: [0, 0, -CUBE_HALF],
            u: [-1, 0, 0],
            v: [0, 1, 0],
            normal: [0, 0, -1]
        }
    ];

    let canvas = null;
    let ctx = null;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationId = 0;
    let resizeBound = false;
    let isPaused = false;
    let currentProgress = 1;
    let animationStart = 0;
    let dieStates = [];

    const ease = cubicBezier(0.2, 0.8, 0.2, 1);

    function init(canvasId) {
        const found = document.getElementById(canvasId);

        if (!found) {
            return;
        }

        if (canvas === found && ctx) {
            resize();
            return;
        }

        canvas = found;
        ctx = canvas.getContext('2d', { alpha: true });

        if (!ctx) {
            return;
        }

        ctx.imageSmoothingEnabled = true;
        resize();

        if (!resizeBound) {
            window.addEventListener('resize', resize, { passive: true });
            resizeBound = true;
        }
    }

    function resize() {
        if (!canvas || !ctx) {
            return;
        }

        width = Math.max(1, Math.floor(canvas.clientWidth || canvas.width || 1));
        height = Math.max(1, Math.floor(canvas.clientHeight || canvas.height || 1));
        dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (dieStates.length > 0) {
            drawScene(currentProgress);
        } else {
            ctx.clearRect(0, 0, width, height);
        }
    }

    function roll(canvasId, payload) {
        init(canvasId);

        if (!ctx) {
            return;
        }

        const values = extractDieSpecs(payload);
        dieStates = values.map((spec, index) => buildDieState(spec.value, index, spec));
        currentProgress = 0;
        animationStart = performance.now();

        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(animate);
    }

    function animate(time) {
        if (!ctx) {
            return;
        }

        if (!animationStart) {
            animationStart = time;
        }

        if (!isPaused) {
            const raw = clamp((time - animationStart) / DURATION_MS, 0, 1);
            currentProgress = ease(raw);
        }

        drawScene(currentProgress);

        if (currentProgress < 1 || isPaused) {
            animationId = requestAnimationFrame(animate);
        } else {
            animationId = 0;
        }
    }

    function extractDieSpecs(payload) {
        if (!Array.isArray(payload)) {
            if (payload && Array.isArray(payload.diceValues)) {
                return payload.diceValues
                    .map((value) => ({
                        value: toNumber(value),
                        color: payload.diceColor,
                        style: payload.diceStyle
                    }))
                    .filter((entry) => isFinitePositive(entry.value));
            }

            return [];
        }

        const entries = [];

        for (const payloadEntry of payload) {
            const diceValues = payloadEntry && Array.isArray(payloadEntry.diceValues) ? payloadEntry.diceValues : [];

            for (const value of diceValues) {
                const numeric = toNumber(value);

                if (isFinitePositive(numeric)) {
                    entries.push({
                        value: numeric,
                        color: payloadEntry?.diceColor,
                        style: payloadEntry?.diceStyle
                    });
                }
            }
        }

        return entries;
    }

    function toNumber(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 1;
    }

    function isFinitePositive(value) {
        return Number.isFinite(value) && value > 0;
    }

    function buildDieState(value, index, options) {
        const face = FACE_ROTATIONS[clampFace(value)] || FACE_ROTATIONS[1];
        const spinX = 360 * (2 + ((index + randomInt(0, 1)) % 2));
        const spinY = 360 * (2 + randomInt(0, 1));
        const directionX = randomInt(0, 1) === 0 ? -1 : 1;
        const directionY = randomInt(0, 1) === 0 ? -1 : 1;

        return {
            value: clampFace(value),
            startX: BASE_ROTATION_X + randomFloat(-30, 30),
            startY: BASE_ROTATION_Y + randomFloat(-30, 30),
            endX: BASE_ROTATION_X + face.x + directionX * spinX,
            endY: BASE_ROTATION_Y + face.y + directionY * spinY,
            color: options?.color,
            style: options?.style
        };
    }

    function drawScene(progress) {
        if (!ctx) {
            return;
        }

        ctx.clearRect(0, 0, width, height);

        if (dieStates.length === 0) {
            return;
        }

        const dieCount = dieStates.length;
        const maxSizeFromHeight = height * 0.26;
        const maxSizeFromWidth = (width - 48) / Math.max(1, dieCount * 1.55);
        const size = Math.max(56, Math.min(140, maxSizeFromHeight, maxSizeFromWidth));
        const spacing = size * 1.48;
        const totalWidth = (dieCount - 1) * spacing;
        const startX = width / 2 - totalWidth / 2;
        const centerY = height / 2 + size * 0.01;

        for (let i = 0; i < dieCount; i += 1) {
            const die = dieStates[i];
            const cx = startX + i * spacing;
            drawDie(cx, centerY, size, die, progress);
        }
    }

    function drawDie(cx, cy, size, die, progress) {
        const rx = lerp(die.startX, die.endX, progress);
        const ry = lerp(die.startY, die.endY, progress);

        drawShadow(cx, cy, size, die);

        const faces = FACE_DEFS
            .map((face) => buildFaceGeometry(face, rx, ry, size, cx, cy))
            .filter((face) => face.visible)
            .sort((a, b) => a.depth - b.depth);

        for (const face of faces) {
            drawFace(face, size, face.value, die);
        }
    }

    function drawShadow(cx, cy, size, die) {
        const shadowY = cy + size * 0.58;
        const shadowWidth = size * 0.78;

        ctx.save();
        ctx.translate(cx, shadowY);
        ctx.scale(1.25, 0.45);

        const baseShadow = ctx.createRadialGradient(0, 0, shadowWidth * 0.08, 0, 0, shadowWidth * 0.72);
        baseShadow.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        baseShadow.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
        baseShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = baseShadow;
        ctx.beginPath();
        ctx.arc(0, 0, shadowWidth * 0.72, 0, Math.PI * 2);
        ctx.fill();

        const theme = buildDieTheme(die?.color, die?.style);
        const glow = ctx.createRadialGradient(0, 0, shadowWidth * 0.02, 0, 0, shadowWidth * 0.9);
        glow.addColorStop(0, theme.shadowGlow);
        glow.addColorStop(0.7, theme.shadowFade);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, shadowWidth * 0.78, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function buildFaceGeometry(face, rx, ry, size, cx, cy) {
        const scale = size;
        const center = rotateVector(face.center, rx, ry);
        const u = rotateVector(face.u, rx, ry);
        const v = rotateVector(face.v, rx, ry);
        const normal = rotateVector(face.normal, rx, ry);

        const corners = [
            addVectors(center, scaleVector(u, -CUBE_HALF), scaleVector(v, -CUBE_HALF)),
            addVectors(center, scaleVector(u, CUBE_HALF), scaleVector(v, -CUBE_HALF)),
            addVectors(center, scaleVector(u, CUBE_HALF), scaleVector(v, CUBE_HALF)),
            addVectors(center, scaleVector(u, -CUBE_HALF), scaleVector(v, CUBE_HALF))
        ];

        const points = corners.map((corner) => projectPoint(corner, cx, cy, scale));
        const depth = center[2];
        const visible = normal[2] > 0;

        return {
            key: face.key,
            value: face.value,
            points,
            depth,
            visible,
            center2d: projectPoint(center, cx, cy, scale),
            faceCenter3d: center,
            u3d: u,
            v3d: v,
            dieCenterX: cx,
            dieCenterY: cy
        };
    }

    function drawFace(face, size, value, die) {
        const radius = size * 0.13;
        const points = face.points;
        const center = face.center2d;
        const bounds = faceBounds(points);
        const theme = buildDieTheme(die?.color, die?.style);

        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        roundedPolygonPath(points, radius);

        const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
        gradient.addColorStop(0, theme.faceLight);
        gradient.addColorStop(0.42, theme.faceMid);
        gradient.addColorStop(1, theme.faceDark);

        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.save();
        ctx.clip();

        const inset = ctx.createRadialGradient(center.x, center.y, size * 0.10, center.x, center.y, size * 0.72);
        inset.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
        inset.addColorStop(0.4, theme.faceGlow);
        inset.addColorStop(1, theme.faceShade);

        ctx.fillStyle = inset;
        ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

        if (face.key !== 'top') {
            const sideShade = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
            sideShade.addColorStop(0, theme.sideShadeA);
            sideShade.addColorStop(0.55, theme.sideShadeB);
            sideShade.addColorStop(1, theme.sideShadeC);

            ctx.fillStyle = sideShade;
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
        }

        if (theme.sheenAlpha > 0) {
            const sheen = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
            sheen.addColorStop(0, `rgba(255, 255, 255, ${theme.sheenAlpha})`);
            sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0.04)');
            sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = sheen;
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
        }

        ctx.restore();

        ctx.lineWidth = Math.max(1.5, size * 0.014);
        ctx.strokeStyle = theme.edge;
        ctx.stroke();

        ctx.save();
        roundedPolygonPath(points, radius);
        ctx.clip();
        drawPips(face, size, value, face.dieCenterX, face.dieCenterY, theme);
        ctx.restore();

        ctx.restore();
    }

    function drawPips(face, size, value, dieCenterX, dieCenterY, theme) {
        const pips = FACE_LAYOUTS[clampFace(value)] || [];
        const radius = size * (18 / 280);
        const pipInset = CUBE_HALF;
        const baseCenter = face.faceCenter3d;
        const u = face.u3d;
        const v = face.v3d;

        for (const pip of pips) {
            const point3d = addVectors(
                baseCenter,
                scaleVector(u, pip.u * pipInset),
                scaleVector(v, pip.v * pipInset)
            );

            const point = projectPoint(point3d, dieCenterX, dieCenterY, size);

            const gradient = ctx.createRadialGradient(
                point.x - radius * 0.25,
                point.y - radius * 0.25,
                radius * 0.18,
                point.x,
                point.y,
                radius
            );

            gradient.addColorStop(0, theme.pipLight);
            gradient.addColorStop(0.7, theme.pipMid);
            gradient.addColorStop(1, theme.pipDark);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = theme.pipHighlight;
            ctx.beginPath();
            ctx.arc(point.x - radius * 0.22, point.y - radius * 0.22, radius * 0.28, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function buildDieTheme(color, style) {
        const normalizedStyle = String(style || 'Neon').trim().toLowerCase();
        const preset = STYLE_PRESETS[Object.keys(STYLE_PRESETS).find((key) => key.toLowerCase() === normalizedStyle) || 'Neon'] || STYLE_PRESETS.Neon;
        const base = normalizeHexColor(color, '#7CF7D4');

        const faceLight = mixToCss(base, '#ffffff', preset.lightMix);
        const faceMid = mixToCss(base, '#f4f4f4', preset.midMix);
        const faceDark = mixToCss(base, '#0b1020', preset.darkMix);
        const faceGlow = rgbaFromHex(base, preset.highlightAlpha);
        const faceShade = rgbaFromHex('#000000', 0.10);
        const sideShadeA = rgbaFromHex('#000000', 0.18);
        const sideShadeB = rgbaFromHex('#000000', 0.08);
        const sideShadeC = rgbaFromHex('#ffffff', 0.03);
        const pipLight = mixToCss('#ffffff', base, 0.06);
        const pipMid = mixToCss('#1a1a1f', base, 0.16);
        const pipDark = mixToCss('#050509', base, 0.08);
        const edge = rgbaFromHex(DEFAULT_EDGE, preset.edgeAlpha);
        const shadowGlow = rgbaFromHex(base, 0.16);
        const shadowFade = rgbaFromHex(base, 0.03);

        return {
            faceLight,
            faceMid,
            faceDark,
            faceGlow,
            faceShade,
            sideShadeA,
            sideShadeB,
            sideShadeC,
            pipLight,
            pipMid,
            pipDark,
            pipHighlight: rgbaFromHex('#ffffff', Math.min(0.28, preset.highlightAlpha + 0.04)),
            edge,
            sheenAlpha: preset.sheenAlpha,
            shadowGlow,
            shadowFade
        };
    }

    function normalizeHexColor(color, fallback) {
        const value = String(color || fallback).trim();
        const shortMatch = /^#([0-9a-f]{3})$/i.exec(value);
        if (shortMatch) {
            const expanded = shortMatch[1].split('').map((c) => c + c).join('');
            return `#${expanded.toUpperCase()}`;
        }

        const longMatch = /^#([0-9a-f]{6})$/i.exec(value);
        if (longMatch) {
            return `#${longMatch[1].toUpperCase()}`;
        }

        return fallback;
    }

    function hexToRgb(hex) {
        const match = /^#([0-9a-f]{6})$/i.exec(normalizeHexColor(hex, '#7CF7D4'));
        if (!match) {
            return { r: 124, g: 247, b: 212 };
        }

        const raw = match[1];
        return {
            r: parseInt(raw.slice(0, 2), 16),
            g: parseInt(raw.slice(2, 4), 16),
            b: parseInt(raw.slice(4, 6), 16)
        };
    }

    function rgbaFromHex(hex, alpha) {
        const { r, g, b } = hexToRgb(hex);
        return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
    }

    function mixToCss(fromHex, toHex, amount) {
        const from = hexToRgb(fromHex);
        const to = hexToRgb(toHex);
        const t = clamp(amount, 0, 1);

        const r = Math.round(lerp(from.r, to.r, t));
        const g = Math.round(lerp(from.g, to.g, t));
        const b = Math.round(lerp(from.b, to.b, t));

        return `rgb(${r}, ${g}, ${b})`;
    }

    function roundedPolygonPath(points, radius) {
        if (points.length < 3) {
            return;
        }

        ctx.beginPath();

        for (let i = 0; i < points.length; i += 1) {
            const prev = points[(i - 1 + points.length) % points.length];
            const curr = points[i];
            const next = points[(i + 1) % points.length];

            const prevVec = normalizeVector({ x: prev.x - curr.x, y: prev.y - curr.y });
            const nextVec = normalizeVector({ x: next.x - curr.x, y: next.y - curr.y });

            const start = {
                x: curr.x + prevVec.x * radius,
                y: curr.y + prevVec.y * radius
            };

            const end = {
                x: curr.x + nextVec.x * radius,
                y: curr.y + nextVec.y * radius
            };

            if (i === 0) {
                ctx.moveTo(start.x, start.y);
            } else {
                ctx.lineTo(start.x, start.y);
            }

            ctx.quadraticCurveTo(curr.x, curr.y, end.x, end.y);
        }

        ctx.closePath();
    }

    function faceBounds(points) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const point of points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        return {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY
        };
    }

    function projectPoint(point3d, cx, cy, size) {
        const perspective = PERSPECTIVE;
        const scale = perspective / (perspective - point3d[2]);

        return {
            x: cx + point3d[0] * size * scale,
            y: cy - point3d[1] * size * scale
        };
    }

    function rotateVector(vector, rxDeg, ryDeg) {
        const rx = degToRad(rxDeg);
        const ry = degToRad(ryDeg);

        let x = vector[0];
        let y = vector[1];
        let z = vector[2];

        const cosX = Math.cos(rx);
        const sinX = Math.sin(rx);

        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;

        y = y1;
        z = z1;

        const cosY = Math.cos(ry);
        const sinY = Math.sin(ry);

        const x2 = x * cosY + z * sinY;
        const z2 = -x * sinY + z * cosY;

        x = x2;
        z = z2;

        return [x, y, z];
    }

    function addVectors(base, ...vectors) {
        let x = base[0];
        let y = base[1];
        let z = base[2];

        for (const vector of vectors) {
            x += vector[0];
            y += vector[1];
            z += vector[2];
        }

        return [x, y, z];
    }

    function scaleVector(vector, scalar) {
        return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
    }

    function normalizeVector(vector) {
        const length = Math.hypot(vector.x, vector.y) || 1;
        return { x: vector.x / length, y: vector.y / length };
    }

    function lerp(from, to, t) {
        return from + (to - from) * t;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function clampFace(value) {
        const integer = Math.trunc(Number(value) || 1);

        if (integer < 1) return 1;
        if (integer > 6) return 6;

        return integer;
    }

    function degToRad(value) {
        return value * Math.PI / 180;
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    function cubicBezier(p1x, p1y, p2x, p2y) {
        const cx = 3 * p1x;
        const bx = 3 * (p2x - p1x) - cx;
        const ax = 1 - cx - bx;

        const cy = 3 * p1y;
        const by = 3 * (p2y - p1y) - cy;
        const ay = 1 - cy - by;

        function sampleCurveX(t) {
            return ((ax * t + bx) * t + cx) * t;
        }

        function sampleCurveY(t) {
            return ((ay * t + by) * t + cy) * t;
        }

        function sampleCurveDerivativeX(t) {
            return (3 * ax * t + 2 * bx) * t + cx;
        }

        function solveCurveX(x) {
            let t = x;

            for (let i = 0; i < 8; i += 1) {
                const x2 = sampleCurveX(t) - x;

                if (Math.abs(x2) < 1e-6) {
                    return t;
                }

                const d2 = sampleCurveDerivativeX(t);

                if (Math.abs(d2) < 1e-6) {
                    break;
                }

                t -= x2 / d2;
            }

            let t0 = 0;
            let t1 = 1;
            t = x;

            while (t0 < t1) {
                const x2 = sampleCurveX(t);

                if (Math.abs(x2 - x) < 1e-6) {
                    return t;
                }

                if (x > x2) {
                    t0 = t;
                } else {
                    t1 = t;
                }

                t = (t1 + t0) / 2;
            }

            return t;
        }

        return function (x) {
            if (x <= 0) return 0;
            if (x >= 1) return 1;
            return sampleCurveY(solveCurveX(x));
        };
    }

    function setPaused(value) {
        isPaused = Boolean(value);

        if (!isPaused && dieStates.length > 0 && animationId === 0 && currentProgress < 1) {
            animationStart = performance.now() - currentProgress * DURATION_MS;
            animationId = requestAnimationFrame(animate);
        }
    }

    function reset() {
        cancelAnimationFrame(animationId);
        animationId = 0;
        animationStart = 0;
        currentProgress = 1;
        dieStates = [];

        if (ctx && canvas) {
            ctx.clearRect(0, 0, width, height);
        }
    }

    return {
        roll,
        setPaused,
        reset
    };

})();