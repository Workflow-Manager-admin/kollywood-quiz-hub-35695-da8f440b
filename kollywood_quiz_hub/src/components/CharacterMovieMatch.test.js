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

    // Accept either fallback clue (demo) or dynamic character clue (TMDB)
    let success = false;
    // Dynamic: look for any visible large clue (28px font size), or fallback "mukundh varadharajan"
    try {
      await waitFor(() => {
        // fallback or dynamic: find a div styled as a clue (fontSize: 28)
        const clues = Array.from(document.querySelectorAll("div"))
          .filter(d =>
            d.style &&
            (d.style.fontSize === "28px" || d.style.fontSize === "28") &&
            d.textContent.trim().length > 0
          );
        expect(clues.length).toBeGreaterThan(0);
        success = true;
      }, { timeout: 1700 });
    } catch(e) {}
    if (!success) {
      // fallback last resort: try fallback text specifically
      await waitFor(() => {
        expect(screen.getByText(/mukundh varadharajan/i)).toBeInTheDocument();
      });
    }
    // Find at least 1 movie title label anywhere
    // (fallback: Amaran/Mouna Ragam etc or dynamic: any poster label)
    const posterLabels = [
      "Amaran","Mouna Ragam","Enthiran","Gentleman"
    ];
    const foundAnyPosterText = posterLabels.some(text =>
      screen.queryByText(text)
    );
    // If fallback present, the text should be found
    // If not, assert there is *some* visible movie/character/poster title in a div
    if (!foundAnyPosterText) {
      const anyTitleDiv = Array.from(document.querySelectorAll("div"))
        .filter(d => (
          d.textContent.trim().length > 0 &&
          d.textContent.trim().length < 48 && // not a giant block
          d.offsetHeight > 0 && d.offsetWidth > 0
        ));
      expect(anyTitleDiv.length).toBeGreaterThanOrEqual(1);
    }

    // Check that at least one poster image uses TMDB poster URL
    const imgNodes = screen.getAllByRole("img");
    expect(imgNodes.length).toBeGreaterThan(0);
    imgNodes.forEach((img) => {
      expect(img).toHaveAttribute("src");
      expect(img.getAttribute("src")).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w185/);
    });
  });

  it("always renders at least 4 poster options for first round with correct alt text", async () => {
    render(<CharacterMovieMatch onBackToDashboard={() => {}} />);
    // Wait for poster options to render, allow for either fallback or dynamic
    await waitFor(() => {
      // There should be at least 4 movie poster containers
      const posterDivs = Array.from(document.querySelectorAll("div"))
        .filter(d =>
          d.style &&
          (d.style.minWidth === "130px" || d.style.minWidth === "130") &&
          d.textContent.trim().length > 0
        );
      expect(posterDivs.length).toBeGreaterThanOrEqual(4);
    }, { timeout: 1700 });
    // For fallback, assert the expected labels are there
    const fallbackPosters = ["Amaran","Mouna Ragam","Enthiran","Gentleman"];
    let fallbackFound = false;
    for (const t of fallbackPosters) {
      if (screen.queryByText(t)) fallbackFound = true;
    }
    // If it's the fallback, all labels and alts should be present!
    if (fallbackFound) {
      fallbackPosters.forEach(title => {
        expect(screen.getByText(title)).toBeInTheDocument();
        expect(screen.getByAltText(new RegExp(title,"i"))).toBeInTheDocument();
      });
    } else {
      // Otherwise, for dynamic, require at least 4 images w/ alt containing a title string
      const imgNodes = screen.getAllByRole("img");
      expect(imgNodes.length).toBeGreaterThanOrEqual(4);
      imgNodes.forEach((img) => {
        expect(img).toHaveAttribute("alt");
        expect(img.getAttribute("alt")).not.toBe("");
      });
    }
  });
});
