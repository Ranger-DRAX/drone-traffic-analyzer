import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_DEV_API_BASE_URL = "http://127.0.0.1:8000/api";
const REQUEST_HEADERS_TO_STRIP = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const RESPONSE_HEADERS_TO_STRIP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

type ProxyFetchInit = RequestInit & {
  duplex?: "half";
};

function getBackendApiBaseUrl(): string {
  const configuredBaseUrl =
    process.env.BACKEND_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    LOCAL_DEV_API_BASE_URL;

  try {
    const url = new URL(configuredBaseUrl);
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = "/api";
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    throw new Error(
      "Invalid BACKEND_API_BASE_URL. Use a full URL such as https://your-backend.example.com/api",
    );
  }
}

function buildUpstreamUrl(pathSegments: string[], search: string): string {
  const baseUrl = new URL(getBackendApiBaseUrl());
  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const encodedPath = pathSegments.map(encodeURIComponent).join("/");

  baseUrl.pathname = encodedPath ? `${basePath}/${encodedPath}` : basePath;
  baseUrl.search = search;

  return baseUrl.toString();
}

function copyRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  for (const header of REQUEST_HEADERS_TO_STRIP) {
    headers.delete(header);
  }
  return headers;
}

function copyResponseHeaders(response: Response): Headers {
  const headers = new Headers(response.headers);
  for (const header of RESPONSE_HEADERS_TO_STRIP) {
    headers.delete(header);
  }
  return headers;
}

async function proxyRequest(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path = [] } = await context.params;
  const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.search);
  const requestHeaders = copyRequestHeaders(request);
  const method = request.method.toUpperCase();
  const init: ProxyFetchInit = {
    method,
    headers: requestHeaders,
    cache: "no-store",
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, init);
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: copyResponseHeaders(upstreamResponse),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error while contacting the backend API";

    return Response.json(
      {
        detail: `The frontend could not reach the backend API at ${upstreamUrl}. ${message}`,
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext): Promise<Response> {
  return proxyRequest(request, context);
}
