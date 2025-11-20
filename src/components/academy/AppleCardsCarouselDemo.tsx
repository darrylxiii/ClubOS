import React from "react";
import { Carousel, Card, CardType } from "@/components/ui/apple-cards-carousel";

export default function AppleCardsCarouselDemo() {
  const cards = data.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <div className="w-full h-full py-20">
      <h2 className="max-w-7xl pl-4 mx-auto text-xl md:text-5xl font-bold text-foreground font-sans">
        Explore Our Academy Courses
      </h2>
      <Carousel items={cards} />
    </div>
  );
}

const DummyContent = () => {
  return (
    <>
      {[...new Array(3).fill(1)].map((_, index) => {
        return (
          <div
            key={"dummy-content" + index}
            className="bg-muted p-8 md:p-14 rounded-3xl mb-4"
          >
            <p className="text-muted-foreground text-base md:text-2xl font-sans max-w-3xl mx-auto">
              <span className="font-bold text-foreground">
                Master the skills that matter.
              </span>{" "}
              Join thousands of professionals advancing their careers through
              our comprehensive learning paths and expert-led courses.
            </p>
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
              alt="Course preview"
              className="md:w-1/2 md:h-1/2 h-full w-full mx-auto object-contain rounded-xl mt-8"
            />
          </div>
        );
      })}
    </>
  );
};

const data: CardType[] = [
  {
    category: "Leadership",
    title: "Executive Leadership Program",
    src: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Technology",
    title: "AI & Machine Learning",
    src: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Strategy",
    title: "Business Strategy Masterclass",
    src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Innovation",
    title: "Product Innovation & Design",
    src: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=2070&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Finance",
    title: "Financial Management Excellence",
    src: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2011&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Marketing",
    title: "Digital Marketing Strategy",
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
    content: <DummyContent />,
  },
];
