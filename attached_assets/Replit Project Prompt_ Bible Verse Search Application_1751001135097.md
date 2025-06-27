# Replit Project Prompt: Bible Verse Search Application

## 1. Introduction

This project aims to develop a web-based Bible verse search application on Replit. The application will allow users to easily navigate through the Bible by selecting specific books, chapters, and verses. Additionally, it will include a powerful search functionality to find verses based on keywords or phrases. The core data for this application will be retrieved using the API.Bible, a comprehensive and well-documented API for accessing Bible content.

## 2. Features

The application should implement the following features:

### 2.1. Book Selection

*   A combo box (dropdown menu) labeled "Book" will display all books of the Bible.
*   The books must be ordered from Genesis to Revelation.
*   The list should visually or logically separate Old Testament books from New Testament books.

### 2.2. Chapter Selection

*   A combo box labeled "Chapter" will dynamically populate with the available chapters for the book selected in the "Book" combo box.

### 2.3. Verse Selection and Display

*   A combo box labeled "Verse" will dynamically populate with the available verses for the selected book and chapter.
*   Upon selecting a verse, the full text of that verse will be displayed clearly on the page.

### 2.4. Word/Phrase Search

*   A text input field will allow users to enter a word or phrase.
*   Upon submission, the application will search the entire Bible for verses containing the entered word or phrase.
*   Search results should display the book, chapter, verse number, and the text of each matching verse.
*   Consider highlighting the searched word/phrase within the results if feasible.

## 3. API Integration: API.Bible

The application will interact with the API.Bible to fetch all necessary Bible content. The user already has an API key, which will be added to Replit secrets. The application should retrieve this key from the environment variables.

### 3.1. Base URL

The base URL for all API.Bible requests is `https://api.scripture.api.bible/v1`.

### 3.2. Authentication

All requests to the API.Bible require an `api-key` header. This key should be securely stored in Replit secrets and accessed as an environment variable in the application code.

### 3.3. Endpoints and Usage

#### 3.3.1. List Bibles

To get a list of available Bibles and their `bibleId`s (which are necessary for subsequent requests), use the following endpoint:

*   **Endpoint**: `/bibles`
*   **Method**: `GET`
*   **Purpose**: Retrieve a list of all Bibles accessible with the provided API key. This is crucial for selecting a default Bible version or allowing the user to choose one.
*   **Example Response (simplified)**:

```json
{
  "data": [
    {
      "id": "de4e12af7f28f599-01",
      "abbreviation": "KJV",
      "name": "King James Version"
    },
    {
      "id": "06125adad2d5898a-01",
      "abbreviation": "NIV",
      "name": "New International Version"
    }
  ]
}
```

#### 3.3.2. List Books within a Bible

To populate the "Book" combo box, you will need to fetch all books for a specific `bibleId`.

*   **Endpoint**: `/bibles/{bibleId}/books`
*   **Method**: `GET`
*   **Path Parameter**: `bibleId` (e.g., `de4e12af7f28f599-01` for KJV)
*   **Purpose**: Get a list of all books within a specified Bible version. The response will include `id`, `name`, and `nameLong` for each book. These can be used to populate the book dropdown.
*   **Example Response (simplified)**:

```json
{
  "data": [
    {
      "id": "GEN",
      "bibleId": "de4e12af7f28f599-01",
      "abbreviation": "Gen",
      "name": "Genesis",
      "nameLong": "The First Book of Moses, called Genesis"
    },
    {
      "id": "EXO",
      "bibleId": "de4e12af7f28f599-01",
      "abbreviation": "Exo",
      "name": "Exodus",
      "nameLong": "The Second Book of Moses, called Exodus"
    }
  ]
}
```

#### 3.3.3. List Chapters within a Book

To populate the "Chapter" combo box, you will need to fetch all chapters for a specific book within a Bible.

*   **Endpoint**: `/bibles/{bibleId}/books/{bookId}/chapters`
*   **Method**: `GET`
*   **Path Parameters**: `bibleId`, `bookId` (e.g., `GEN` for Genesis)
*   **Purpose**: Retrieve a list of all chapters for a given book. The `number` field in the response can be used to populate the chapter dropdown.
*   **Example Response (simplified)**:

```json
{
  "data": [
    {
      "id": "GEN.1",
      "bibleId": "de4e12af7f28f599-01",
      "bookId": "GEN",
      "number": "1"
    },
    {
      "id": "GEN.2",
      "bibleId": "de4e12af7f28f599-01",
      "bookId": "GEN",
      "number": "2"
    }
  ]
}
```

#### 3.3.4. List Verses within a Chapter

To populate the "Verse" combo box and display the verse content, you will need to fetch all verses for a specific chapter.

*   **Endpoint**: `/bibles/{bibleId}/chapters/{chapterId}/verses`
*   **Method**: `GET`
*   **Path Parameters**: `bibleId`, `chapterId` (e.g., `GEN.1` for Genesis Chapter 1)
*   **Purpose**: Retrieve a list of all verses within a specified chapter. The `number` field can be used for the verse dropdown, and the `content` field will contain the verse text.
*   **Example Response (simplified)**:

```json
{
  "data": [
    {
      "id": "GEN.1.1",
      "bibleId": "de4e12af7f28f599-01",
      "chapterId": "GEN.1",
      "content": "In the beginning God created the heaven and the earth.",
      "verseNumber": "1"
    },
    {
      "id": "GEN.1.2",
      "bibleId": "de4e12af7f28f599-01",
      "chapterId": "GEN.1",
      "content": "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
      "verseNumber": "2"
    }
  ]
}
```

#### 3.3.5. Search Verses by Keyword/Phrase

To implement the word/phrase search functionality, use the search endpoint.

*   **Endpoint**: `/bibles/{bibleId}/search`
*   **Method**: `GET`
*   **Path Parameter**: `bibleId`
*   **Query Parameter**: `query` (the word or phrase to search for)
*   **Purpose**: Search for verses containing the specified `query` within a given Bible version. The response will include matching verses with their content, book, chapter, and verse information.
*   **Example Response (simplified)**:

```json
{
  "data": {
    "verses": [
      {
        "id": "JHN.3.16",
        "bibleId": "de4e12af7f28f599-01",
        "orgId": "JHN.3.16",
        "bookId": "JHN",
        "chapterId": "JHN.3",
        "content": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
        "reference": "John 3:16"
      }
    ]
  }
}
```

## 4. Technical Considerations for Replit

### 4.1. Frontend (HTML, CSS, JavaScript)

*   **HTML**: Structure the page with appropriate `div` elements for layout, `select` elements for combo boxes, `input` for search, and a `div` or `p` for displaying verse content.
*   **CSS**: Style the application for a clean, user-friendly interface. Ensure responsiveness for different screen sizes.
*   **JavaScript**: Handle all dynamic interactions:
    *   Fetch Bibles on page load.
    *   Populate Book combo box.
    *   Listen for changes in Book selection to populate Chapter combo box.
    *   Listen for changes in Chapter selection to populate Verse combo box.
    *   Listen for changes in Verse selection to display the verse content.
    *   Handle search form submission, make API calls, and display results.
    *   Error handling for API requests (e.g., network issues, invalid API key).

### 4.2. Backend (Optional, but Recommended for API Key Security)

While API.Bible can be called directly from the frontend, for better security of your API key, it is highly recommended to use a simple backend (e.g., Node.js with Express, Python with Flask) to proxy the API requests. This way, your API key is never exposed in the client-side code.

If a backend is used:

*   The backend will receive requests from the frontend (e.g., `/api/books?bibleId=...`).
*   The backend will then make the actual request to API.Bible, including the `api-key` from Replit secrets.
*   The backend will return the data from API.Bible to the frontend.

### 4.3. Replit Secrets

Ensure the API.Bible key is stored as a Replit secret (e.g., `API_BIBLE_KEY`) and accessed in your backend code (or directly in frontend if not using a backend, though less secure) using `process.env.API_BIBLE_KEY` (Node.js) or `os.environ.get('API_BIBLE_KEY')` (Python).

## 5. Development Steps (Suggested)

1.  **Set up Replit Project**: Create a new Replit project (e.g., using a Node.js or Python template).
2.  **Configure Secrets**: Add your API.Bible key to Replit secrets.
3.  **Initial API Call**: Start by making a request to the `/bibles` endpoint to verify API connectivity and retrieve a `bibleId`.
4.  **Implement Book Selection**: Fetch books for a chosen `bibleId` and populate the 


Book combo box.
5.  **Implement Chapter Selection**: Based on the selected book, fetch and populate the Chapter combo box.
6.  **Implement Verse Selection and Display**: Based on the selected chapter, fetch and populate the Verse combo box. Display the verse content upon selection.
7.  **Implement Word/Phrase Search**: Develop the search functionality using the `/search` endpoint. Display results clearly.
8.  **Refine UI/UX**: Ensure the application is visually appealing and easy to use.
9.  **Error Handling**: Implement robust error handling for API calls and user input.

## 6. Conclusion

This prompt provides a comprehensive guide for developing a Bible verse search application on Replit using the API.Bible. By following these steps and leveraging the API's capabilities, a functional and user-friendly application can be created. Remember to prioritize security by handling your API key responsibly and consider implementing a backend for enhanced protection.

