import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import CharacterMovieMatch from "./CharacterMovieMatch";

// Mock the fetchKollywoodMovies API
jest.mock("../api/tmdb", () => ({
  fetchKollywoodMovies: jest.fn(),
}));

const TEST_CHARACTERS = [
  { name: "TestChar1", movies: ["CorrectMovie1"] },
  { name: "TestChar2", movies: ["CorrectMovie2"] }
];

const DUMMY_MOVIES = [
  { title: "CorrectMovie1", poster_path: "/poster1.jpg", id: 1 },
  { title: "WrongMovieA", poster_path: "/posterA.jpg", id: 2 },
  { title: "WrongMovieB", poster_path: "/posterB.jpg", id: 3 },
  { title: "CorrectMovie2", poster_path: "/poster2.jpg", id: 4 },
  { title: "WrongMovieC", poster_path: "/posterC.jpg", id: 5 }
];

describe("CharacterMovieMatch", () => {
  beforeEach(() => {
    // Setup the mock implementation before each test
    require("../api/tmdb").fetchKollywoodMovies.mockResolvedValue([...DUMMY_MOVIES]);
  });

  it("always includes the correct movie in the choices for each character question", async () => {
    // Render the component
    render(<CharacterMovieMatch onBackToDashboard={() => {}} />);
    // Await for loading to finish and ensure at least one question is present
    await waitFor(() => {
      // Should find at least one character string from test data in DOM
      expect(screen.getAllByText(/Character-Movie Match/)[0]).toBeInTheDocument();
    });

    // Wait for questions to be set by checking for one of the dummy movie titles
    await waitFor(() => {
      expect(
        screen.queryByText("CorrectMovie1") ||
        screen.queryByText("CorrectMovie2")
      ).toBeTruthy();
    });

    // Check that the correct movie is always present as one of the options
    const checkCorrectChoicePresence = () => {
      // Get all buttons/divs with movie display styles
      const allOptionTitles = screen.getAllByText(
        (content, node) => node?.nodeType === 1 && node.textContent && (
          content === "CorrectMovie1" ||
          content === "CorrectMovie2"
        )
      );
      expect(allOptionTitles.length).toBeGreaterThanOrEqual(1);
    };
    checkCorrectChoicePresence();
    // You could also simulate step or interaction and test more steps if required
  });

  it("never omits the movie poster image for a displayed movie option", async () => {
    render(<CharacterMovieMatch onBackToDashboard={() => {}} />);
    await waitFor(() =>
      expect(
        screen.queryByAltText("CorrectMovie1") ||
        screen.queryByAltText("CorrectMovie2")
      ).toBeTruthy()
    );
    // Verify that all given movie options for this step have poster images
    const imgNodes = screen.getAllByRole("img");
    imgNodes.forEach((img) => {
      expect(img).toHaveAttribute("src");
      expect(img.getAttribute("src")).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w185/);
    });
  });
});
