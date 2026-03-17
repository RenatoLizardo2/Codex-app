// useChat — re-exports streaming chat hook from queries/use-messages
// The useSendMessage hook handles streaming via raw fetch with ReadableStream
// (NOT Vercel AI SDK useChat — see plan decision D2)

export { useSendMessage } from "@/src/hooks/queries/use-messages";
