type Props = {
  title: string;
  note?: string;
};

export default function Placeholder(props: Props) {
  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>{props.title}</h1>
      <div style={{ marginTop: 10, opacity: 0.8 }}>
        {props.note ?? "Placeholder route. Will be implemented in later OPS-ARCH steps."}
      </div>
    </div>
  );
}