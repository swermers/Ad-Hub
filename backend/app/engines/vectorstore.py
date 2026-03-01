import chromadb

from app.config import settings

_client: chromadb.ClientAPI | None = None


def get_vectorstore() -> "VectorStore":
    return VectorStore()


class VectorStore:
    """Wrapper around ChromaDB for local vector storage with built-in embeddings."""

    def __init__(self):
        global _client
        if _client is None:
            _client = chromadb.PersistentClient(path=settings.chromadb_path)
        self.client = _client

    def _get_collection(self, product_id: str) -> chromadb.Collection:
        """Get or create a collection for a product."""
        return self.client.get_or_create_collection(
            name=f"product_{product_id.replace('-', '_')}",
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(
        self,
        product_id: str,
        texts: list[str],
        metadatas: list[dict] | None = None,
    ) -> None:
        """Add documents to the vector store for a product."""
        collection = self._get_collection(product_id)

        # ChromaDB needs unique IDs
        ids = [f"{product_id}_{i}_{hash(t) % 10**8}" for i, t in enumerate(texts)]

        # Chunk texts if they're too long for embedding
        chunked_texts = []
        chunked_metadatas = []
        chunked_ids = []

        for i, text in enumerate(texts):
            chunks = _chunk_text(text)
            for j, chunk in enumerate(chunks):
                chunked_texts.append(chunk)
                chunked_ids.append(f"{ids[i]}_chunk_{j}")
                meta = dict(metadatas[i]) if metadatas and i < len(metadatas) else {}
                meta["chunk_index"] = j
                chunked_metadatas.append(meta)

        if chunked_texts:
            collection.upsert(
                documents=chunked_texts,
                metadatas=chunked_metadatas,
                ids=chunked_ids,
            )

    def query(
        self,
        product_id: str,
        query_text: str,
        n_results: int = 5,
    ) -> list[dict]:
        """Query for similar documents."""
        collection = self._get_collection(product_id)

        if collection.count() == 0:
            return []

        results = collection.query(
            query_texts=[query_text],
            n_results=min(n_results, collection.count()),
        )

        documents = []
        for i in range(len(results["documents"][0])):
            documents.append({
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else None,
            })

        return documents

    def delete_product(self, product_id: str) -> None:
        """Delete all vectors for a product."""
        name = f"product_{product_id.replace('-', '_')}"
        try:
            self.client.delete_collection(name)
        except ValueError:
            pass


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks."""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap

    return chunks
