import { memo } from 'react';
import { Helmet } from 'react-helmet-async';

interface JsonLdProps {
  schema: object | object[];
}

/**
 * Injects JSON-LD structured data into the page head
 * Supports single schema or array of schemas
 */
export const JsonLd = memo(function JsonLd({ schema }: JsonLdProps) {
  const schemas = Array.isArray(schema) ? schema : [schema];
  
  return (
    <Helmet>
      {schemas.map((s, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </Helmet>
  );
});
