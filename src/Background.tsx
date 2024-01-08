import bg from "./background.svg?url";

export const Background = () => {
  console.log(bg);
  return (
    <div
      className="bg"
      style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover" }}
    />
  );
};
