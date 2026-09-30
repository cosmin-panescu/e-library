export default function BookCarousel3D({ books = [] }) {
  if (!books || books.length === 0) return null;

  const N = books.length;
  const cot = (1 / Math.tan(Math.PI / N)).toFixed(4);

  return (
    <div className="scene pointer-events-none select-none">
      <div className="a3d" style={{ "--n": N, "--cot": cot }}>
        {books.map((book, i) => (
          <img
            key={book.id || i}
            className="card"
            src={book.cover}
            style={{ "--i": i }}
            alt={book.title}
            loading="eager"
            decoding="async"
          />
        ))}
      </div>
    </div>
  );
}
