export function Footer(): React.ReactNode {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-10 px-5 mt-16 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              About GoBusker
            </h3>
            <p className="text-sm leading-relaxed">
              GoBusker connects street musicians with audiences, helping artists share their talent and build their community.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Quick Links
            </h3>
            <ul className="list-none p-0 m-0 space-y-2">
              <li>
                <a href="/" className="text-gray-600 dark:text-gray-300 no-underline text-sm transition-colors duration-300 hover:text-accent">
                  Home
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-gray-600 dark:text-gray-300 no-underline text-sm transition-colors duration-300 hover:text-accent">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/create-profile" className="text-gray-600 dark:text-gray-300 no-underline text-sm transition-colors duration-300 hover:text-accent">
                  Create Profile
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Support
            </h3>
            <ul className="list-none p-0 m-0 space-y-2">
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-300 no-underline text-sm transition-colors duration-300 hover:text-accent">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-300 no-underline text-sm transition-colors duration-300 hover:text-accent">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-300 no-underline text-sm transition-colors duration-300 hover:text-accent">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Follow Us
            </h3>
            <div className="flex gap-3">
              <a href="#" className="flex items-center justify-center w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full text-xl no-underline transition-colors duration-300 hover:bg-accent">
                👍
              </a>
              <a href="#" className="flex items-center justify-center w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full text-xl no-underline transition-colors duration-300 hover:bg-accent">
                👍
              </a>
              <a href="#" className="flex items-center justify-center w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full text-xl no-underline transition-colors duration-300 hover:bg-accent">
                👍
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-300 dark:border-gray-700 pt-5 text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="m-0">
            © 2024 GoBusker. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
