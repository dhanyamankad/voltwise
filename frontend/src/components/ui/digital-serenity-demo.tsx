import DigitalSerenity from "@/components/ui/digital-serenity-animated-landing-page";

const DemoOne = () => {
  return (
    <DigitalSerenity
      onNavigateDriver={() => alert('Navigate to Driver View')}
      onNavigateOperator={() => alert('Navigate to Operator Console')}
    />
  );
};

export { DemoOne };
