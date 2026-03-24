import type * as React from "react"

interface EmailLayoutProps {
  children: React.ReactNode
  previewText?: string
}

export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <html>
      {/* eslint-disable-next-line @next/next/no-head-element -- Email templates use HTML head, not Next.js Head */}
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        {previewText && (
          <span
            style={{
              display: "none",
              overflow: "hidden",
              lineHeight: "1px",
              opacity: 0,
              maxHeight: 0,
              maxWidth: 0,
            }}
          >
            {previewText}
          </span>
        )}
      </head>
      <body
        style={{
          fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          backgroundColor: "#f4f4f5",
          margin: 0,
          padding: 0,
        }}
      >
        <table
          role="presentation"
          width="100%"
          style={{
            backgroundColor: "#f4f4f5",
            padding: "40px 20px",
          }}
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                style={{
                  maxWidth: "600px",
                  width: "100%",
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#2D1B69",
                      padding: "32px 40px",
                      textAlign: "center",
                    }}
                  >
                    <h1
                      style={{
                        margin: 0,
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: "#ffffff",
                      }}
                    >
                      Auto
                      <span
                        style={{
                          background: "linear-gradient(90deg, #7ED321, #00D9FF)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        Lenis
                      </span>
                    </h1>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: "40px" }}>{children}</td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#f9fafb",
                      padding: "32px 40px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <table role="presentation" width="100%">
                      <tr>
                        <td style={{ textAlign: "center" }}>
                          <p
                            style={{
                              margin: "0 0 16px",
                              fontSize: "14px",
                              color: "#6b7280",
                            }}
                          >
                            Buy Your Car the Smart Way
                          </p>
                          <p
                            style={{
                              margin: "0 0 16px",
                              fontSize: "12px",
                              color: "#9ca3af",
                            }}
                          >
                            AutoLenis Inc. | 123 Auto Drive, San Francisco, CA 94102
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "#9ca3af",
                            }}
                          >
                            <a
                              href="https://autolenis.com/unsubscribe"
                              style={{ color: "#2D1B69", textDecoration: "underline" }}
                            >
                              Unsubscribe
                            </a>
                            {" • "}
                            <a
                              href="https://autolenis.com/legal/privacy"
                              style={{ color: "#2D1B69", textDecoration: "underline" }}
                            >
                              Privacy Policy
                            </a>
                            {" • "}
                            <a
                              href="https://autolenis.com/legal/terms"
                              style={{ color: "#2D1B69", textDecoration: "underline" }}
                            >
                              Terms of Service
                            </a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}
