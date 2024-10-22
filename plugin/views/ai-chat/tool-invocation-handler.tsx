import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  getYouTubeTranscript,
  getYouTubeVideoTitle,
} from "./youtube-transcript";
import { App } from "obsidian";

interface ToolInvocationHandlerProps {
  toolInvocation: any; // Replace 'any' with a more specific type if available
  addToolResult: (result: { toolCallId: string; result: string }) => void;
  results: any; // Add results prop to handle when no search results are found
  onYoutubeTranscript: (
    transcript: string,
    title: string,
    videoId: string
  ) => void;
  onSearchResults: (
    results: {
      title: string;
      content: string;
      reference: string;
      path: string;
    }[]
  ) => void;
  app: App;
}

// New YouTube Handler Component
function YouTubeHandler({
  toolInvocation,
  handleAddResult,
  onYoutubeTranscript,
}: {
  toolInvocation: any;
  handleAddResult: (result: string) => void;
  onYoutubeTranscript: (
    transcript: string,
    title: string,
    videoId: string
  ) => void;
}) {
  const handleYouTubeTranscript = async () => {
    const { videoId } = toolInvocation.args;
    try {
      const transcript = await getYouTubeTranscript(videoId);
      const title = await getYouTubeVideoTitle(videoId);
      onYoutubeTranscript(transcript, title, videoId);
      handleAddResult(JSON.stringify({ transcript, title, videoId }));
      return { transcript, title, videoId };
    } catch (error) {
      console.error("Error fetching YouTube transcript:", error);
      handleAddResult(JSON.stringify({ error: error.message }));
      return { error: error.message };
    }
  };

  if (!("result" in toolInvocation)) {
    handleYouTubeTranscript();
    return (
      <div className="text-sm text-[--text-muted]">
        Fetching the video transcript...
      </div>
    );
  }

  let result;
  try {
    result = toolInvocation.result;
  } catch (error) {
    return (
      <div className="text-sm text-[--text-muted]">
        Error parsing the transcript result
      </div>
    );
  }

  return (
    <div className="text-sm text-[--text-muted]">
      {result.error
        ? `Oops! Couldn't fetch the transcript: ${result.error}`
        : "YouTube transcript successfully retrieved"}
    </div>
  );
}

// New Search Handler Component
function SearchHandler({
  toolInvocation,
  handleAddResult,
  onSearchResults,
  app,
}: {
  toolInvocation: any;
  handleAddResult: (result: string) => void;
  onSearchResults: (results: any[]) => void;
  app: App;
}) {
  const [results, setResults] = useState<any[]>([]);
  const searchNotes = async (query: string) => {
    const files = app.vault.getMarkdownFiles();
    const searchTerms = query.toLowerCase().split(/\s+/);

    const searchResults = await Promise.all(
      files.map(async file => {
        const content = await app.vault.read(file);
        const lowerContent = content.toLowerCase();

        const allTermsPresent = searchTerms.every(term => {
          const regex = new RegExp(`(^|\\W)${term}(\\W|$)`, "i");
          return regex.test(lowerContent);
        });

        if (allTermsPresent) {
          return {
            title: file.basename,
            content: content,
            reference: `Search query: ${query}`,
            path: file.path,
          };
        }
        return null;
      })
    );

    return searchResults.filter(result => result !== null);
  };

  const handleSearchNotes = async () => {
    const { query } = toolInvocation.args;
    try {
      const searchResults = await searchNotes(query);
      setResults(searchResults);
      onSearchResults(searchResults);
      handleAddResult(JSON.stringify(searchResults));
      return searchResults;
    } catch (error) {
      console.error("Error searching notes:", error);
      handleAddResult(JSON.stringify({ error: error.message }));
      return { error: error.message };
    }
  };

  if (!("result" in toolInvocation)) {
    handleSearchNotes();
    return (
      <div className="text-sm text-[--text-muted]">
        Searching through your notes...
      </div>
    );
  }

  if (results && results.length > 0) {
    return (
      <div className="text-sm text-[--text-muted]">
        Found {results.length} matching notes
      </div>
    );
  }

  return (
    <div className="text-sm text-[--text-muted]">
      No files matching that criteria were found
    </div>
  );
}

// Main ToolInvocationHandler component
function ToolInvocationHandler({
  toolInvocation,
  addToolResult,
  results,
  onYoutubeTranscript,
  onSearchResults,
  app,
}: ToolInvocationHandlerProps) {
  const toolCallId = toolInvocation.toolCallId;
  const handleAddResult = (result: string) =>
    addToolResult({ toolCallId, result });

  const getToolTitle = (toolName: string) => {
    switch (toolName) {
      case "getNotesForDateRange":
        return "Fetching Notes";
      case "getSearchQuery":
        return "Searching Notes";
      case "askForConfirmation":
        return "Confirmation Required";
      case "getYoutubeVideoId":
        return "YouTube Transcript";
      case "modifyCurrentNote":
        return "Note Modification";
      case "getLastModifiedFiles":
        return "Recent File Activity";
      case "queryScreenpipe":
        return "Querying Screenpipe Data";
      case "analyzeProductivity":
        return "Analyzing Productivity";
      case "summarizeMeeting":
        return "Summarizing Meeting";
      case "trackProjectTime":
        return "Tracking Project Time";
      default:
        return "Tool Invocation";
    }
  };

  const renderContent = () => {
    switch (toolInvocation.toolName) {
      case "getSearchQuery":
        return (
          <SearchHandler
            toolInvocation={toolInvocation}
            handleAddResult={handleAddResult}
            onSearchResults={onSearchResults}
            app={app}
          />
        );

      case "getYoutubeVideoId":
        return (
          <YouTubeHandler
            toolInvocation={toolInvocation}
            handleAddResult={handleAddResult}
            onYoutubeTranscript={onYoutubeTranscript}
          />
        );

      case "getNotesForDateRange":
        return (
          <div className="text-sm text-[--text-muted]">
            {"result" in toolInvocation
              ? `All notes modified within the following time period were added to the AI context: ${toolInvocation.result}`
              : "Retrieving your notes for the specified time period..."}
          </div>
        );

      case "askForConfirmation":
        return (
          <div className="text-sm text-[--text-muted]">
            <p>{toolInvocation.args.message}</p>
            {"result" in toolInvocation ? (
              <b>{toolInvocation.result}</b>
            ) : (
              <div>
                <button className="bg-[--background-primary] text-white rounded-md px-2 py-1 hover:bg-[--background-secondary]">
                  Confirm
                </button>
                <button className="bg-[--background-primary] text-white rounded-md px-2 py-1 hover:bg-[--background-secondary]">
                  Cancel
                </button>
              </div>
            )}
          </div>
        );

      case "modifyCurrentNote":
        return (
          <div className="text-sm text-[--text-muted]">
            {"result" in toolInvocation
              ? `Changes applied: ${toolInvocation.result}`
              : "Applying changes to your note..."}
          </div>
        );

      case "getLastModifiedFiles":
        if ("result" in toolInvocation) {
          const count = toolInvocation.result;

          if (count) {
            return (
              <div className="text-sm text-[--text-muted]">
                You've modified {count} file{count > 1 ? "s" : ""} recently
              </div>
            );
          }

          return (
            <div className="text-sm text-[--text-muted]">
              Hmm, I couldn't determine your recent file activity
            </div>
          );
        } else {
          return (
            <div className="text-sm text-[--text-muted]">
              Checking your recent file activity...
            </div>
          );
        }

      case "queryScreenpipe":
        return (
          <div className="text-sm text-[--text-muted]">
            {"result" in toolInvocation
              ? "Screenpipe data successfully queried and added to context"
              : "Querying Screenpipe data..."}
          </div>
        );

      case "analyzeProductivity":
        return (
          <div className="text-sm text-[--text-muted]">
            {"result" in toolInvocation
              ? `Productivity analysis completed for the last ${toolInvocation.args.days} days`
              : `Analyzing productivity for the last ${toolInvocation.args.days} days...`}
          </div>
        );

      case "summarizeMeeting":
        return (
          <div className="text-sm text-[--text-muted]">
            {"result" in toolInvocation
              ? "Meeting summary generated"
              : "Summarizing meeting audio..."}
          </div>
        );

      case "trackProjectTime":
        return (
          <div className="text-sm text-[--text-muted]">
            {"result" in toolInvocation
              ? `Project time tracked for "${toolInvocation.args.projectKeyword}" over the last ${toolInvocation.args.days} days`
              : `Tracking time for project "${toolInvocation.args.projectKeyword}" over the last ${toolInvocation.args.days} days...`}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      className="bg-[--background-secondary] rounded-lg p-3 my-2 shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h4 className="m-0 mb-2 text-[--text-normal] text-sm font-semibold">
        {getToolTitle(toolInvocation.toolName)}
      </h4>
      <div className="text-sm text-[--text-muted]">{renderContent()}</div>
    </motion.div>
  );
}

export default ToolInvocationHandler;
