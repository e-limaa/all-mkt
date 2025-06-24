import svgPaths from "./svg-37pygtj5wz";
import clsx from "clsx";
type WrapperProps = {
  additionalClassNames?: string[];
};

function Wrapper({
  children,
  additionalClassNames = [],
}: React.PropsWithChildren<WrapperProps>) {
  return (
    <div className={clsx("relative", additionalClassNames)}>{children}</div>
  );
}

function All() {
  return (
    <Wrapper additionalClassNames={["h-[18.24px]", "shrink-0", "w-[47.66px]"]}>
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 56 22"
      >
        <g id="All">
          <path
            d={svgPaths.p26249600}
            fill="var(--fill-0, #9EA2AF)"
            id="Vector"
          />
          <path
            d={svgPaths.p3ae66c80}
            fill="var(--fill-0, #9EA2AF)"
            id="Vector_2"
          />
          <path
            d={svgPaths.p11827700}
            fill="var(--fill-0, #9EA2AF)"
            id="Vector_3"
          />
        </g>
      </svg>
    </Wrapper>
  );
}

function Group() {
  return (
    <Wrapper
      additionalClassNames={["h-[18.47px]", "shrink-0", "w-[54.84px]"]}
    >
      <div className="absolute bottom-0 left-0 right-[-0.001%] top-0">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 64 22"
        >
          <g id="Group">
            <path
              d={svgPaths.p1c945a80}
              fill="var(--fill-0, white)"
              id="Vector"
            />
            <path
              d={svgPaths.p1cdc5f40}
              fill="var(--fill-0, white)"
              id="Vector_2"
            />
            <path
              d={svgPaths.pe72d780}
              fill="var(--fill-0, white)"
              id="Vector_3"
            />
            <path
              d={svgPaths.p1ed06c00}
              fill="var(--fill-0, #E4002B)"
              id="Vector_4"
            />
          </g>
        </svg>
      </div>
    </Wrapper>
  );
}

export default function Frame1000005813() {
  return (
    <Wrapper additionalClassNames={["size-full"]}>
      <div className="box-border content-stretch flex flex-row gap-[10.41px] items-center justify-start p-0 relative size-full">
        <All />
        <Group />
      </div>
    </Wrapper>
  );
}