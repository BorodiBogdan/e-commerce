type HomePageSliderProps = {
  text: string;
};

const HomePageSlider: React.FC<HomePageSliderProps> = ({ text }) => {
  return (
    <div className="h-[20vh] bg-purple-300 rounded-4xl mr-10 ml-10">
      <div className="w-[50%]">
        <h1 className="pl-20 pt-20">{text}</h1>
      </div>
      <div className="w-[50%]"></div>
    </div>
  );
};

export default HomePageSlider;
