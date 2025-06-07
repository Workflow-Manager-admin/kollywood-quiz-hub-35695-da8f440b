import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import CharacterMovieMatch from "./CharacterMovieMatch";

// Mock the fetchKollywoodMovies API
jest.mock("../api/tmdb", () => ({
  fetchKollywoodMovies: jest.fn(),
}));

describe("CharacterMovieMatch", () => {
  // Instead of relying on test dummy movies, check fallback rendering (since our fallback is robust)
  it("always includes at least one valid question and displays correct movie/poster option(s)", async () => {
    render(<CharacterMovieMatch onBackToDashboard={() => {}} />);
    // Confirm the quiz loads, fallback or otherwise
    await waitFor(() => {
      expect(screen.getAllByText(/Character-Movie Match/)[0]).toBeInTheDocument();
    });

    // Find the fallback character clue text and at least one poster/movie option
    await waitFor(() => {
      // Fallback clue and correct movie: "mukundh varadharajan" with "Amaran"
      expect(screen.getByText(/mukundh varadharajan/i)).toBeInTheDocument();
      expect(screen.getByText(/Amaran/i)).toBeInTheDocument();
    });

    // Check that the poster images for options use TMDB poster path
    const imgNodes = screen.getAllByRole("img");
    // At least one fallback poster should be shown (Amaran, etc.)
    expect(imgNodes.some(img => img.alt === "Amaran")).toBe(true);
    imgNodes.forEach((img) => {
      expect(img).toHaveAttribute("src");
      expect(img.getAttribute("src")).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w185/);
    });
  });

  it("always renders at least 4 poster options for first round with correct alt text", async () => {
    render(<CharacterMovieMatch onBackToDashboard={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/mukundh varadharajan/i)).toBeInTheDocument();
    });
    
    // Fallback has: Amaran, Mouna Ragam, Enthiran, Gentleman
    ["Amaran","Mouna Ragam","Enthiran","Gentleman"].forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument();
      // Check that there is a poster image with correct alt tag for at least one
      expect(screen.getByAltText(title)).toBeInTheDocument();
    });
  });
});
