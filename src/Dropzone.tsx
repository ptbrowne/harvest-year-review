import React, { useCallback, useEffect, useState } from "react";
import { Accept, useDropzone } from "react-dropzone";
import { csvParse } from "d3";
import { ObjectInspector } from "react-inspector";
import { ZodSchema } from "zod";

const Dropzone = <R,>({
  schema,
  onChange,
}: {
  schema: ZodSchema<R>;
  onChange: (data: R) => void;
}) => {
  const [fileError, setFileError] = useState<string | null>(null);

  const onReadCSV = useCallback(async (content: string) => {
    const data = await csvParse(content);

    // Parse the content using the provided schema
    const parsedData = schema.parse(data);
    // Call the onChange callback with the parsed data
    onChange(parsedData);
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setFileError(null);

      // Assuming only one file is dropped
      const file = acceptedFiles[0];

      if (file) {
        try {
          // Read the file content
          const content = await file.text();
          onReadCSV(content);
        } catch (error) {
          setFileError(
            `Error parsing the file. Please make sure the file matches the specified schema: ${error}`
          );
          console.error(error);
        }
      }
    },
    [schema, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [] },
  });

  return (
    <div>
      <div {...getRootProps()} style={dropzoneStyles}>
        <input {...getInputProps()} />
        <p>
          {isDragActive
            ? "Drop the file here..."
            : "Drag and drop a Harvest CSV export here, or click to select one. You can download a report by going to Harvest > Reports > User you are interested in > Detailed report > Export > CSV"}
        </p>
      </div>
      {fileError && <p style={{ color: "red" }}>{fileError}</p>}
    </div>
  );
};

const dropzoneStyles = {
  border: "2px dashed #cccccc",
  borderRadius: "4px",
  padding: "20px",
  textAlign: "center",
  cursor: "pointer",
  marginBottom: "1rem",
} satisfies React.CSSProperties;

export default Dropzone;
