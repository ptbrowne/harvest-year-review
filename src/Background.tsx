import bg from "./background.svg?url";

export const Background = () => {
  return (
    <div
      className="bg"
      style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover" }}
    />
  );
};
