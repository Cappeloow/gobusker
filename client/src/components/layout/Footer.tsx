export function Footer(): React.ReactNode {
  return (
    <footer className="w-full bg-light-card dark:bg-github-card border-t border-light-border dark:border-github-border text-light-text-secondary dark:text-github-text-secondary py-10 px-5 mt-16">
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-github-text">
              About GoBusker
            </h3>
            <p className="text-sm leading-relaxed">
              GoBusker connects street musicians with audiences, helping artists share their talent and build their community.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-github-text">
              Quick Links
            </h3>
            <ul className="list-none p-0 m-0 space-y-2">
              <li>
                <a href="/" className="text-github-text-secondary no-underline text-sm transition-colors duration-300 hover:text-github-blue">
                  Home
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-github-text-secondary no-underline text-sm transition-colors duration-300 hover:text-github-blue">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/create-profile" className="text-github-text-secondary no-underline text-sm transition-colors duration-300 hover:text-github-blue">
                  Create Profile
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-github-text">
              Support
            </h3>
            <ul className="list-none p-0 m-0 space-y-2">
              <li>
                <a href="#" className="text-github-text-secondary no-underline text-sm transition-colors duration-300 hover:text-github-blue">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-github-text-secondary no-underline text-sm transition-colors duration-300 hover:text-github-blue">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-github-text-secondary no-underline text-sm transition-colors duration-300 hover:text-github-blue">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-github-text">
              Follow Us
            </h3>
            <div className="flex gap-3">
              <a href="#" className="flex items-center justify-center w-10 h-10 bg-github-bg border border-github-border hover:border-github-blue rounded-full text-xl no-underline transition-all duration-300">
                👍
              </a>
              <a href="#" className="flex items-center justify-center w-10 h-10 bg-github-bg border border-github-border hover:border-github-blue rounded-full text-xl no-underline transition-all duration-300">
                👍
              </a>
              <a href="#" className="flex items-center justify-center w-10 h-10 bg-github-bg border border-github-border hover:border-github-blue rounded-full text-xl no-underline transition-all duration-300">
                👍
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-github-border pt-5 text-center text-sm text-github-text-muted">
          <p className="m-0">
            © 2024 GoBusker. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
