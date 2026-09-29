import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

// React Router v7 needs these; jsdom under Jest 27 does not provide them.
Object.assign(global, { TextEncoder, TextDecoder });
