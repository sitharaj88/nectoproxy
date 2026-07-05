# Homebrew formula for NectoProxy.
#
# This installs the published `nectoproxy` npm package into the formula's
# libexec using npm, then links the CLI onto the user's PATH. It is the
# standard pattern for distributing a Node-based CLI via Homebrew.
#
# RELEASE CHECKLIST: the `url` and `sha256` below are PLACEHOLDERS.
# At release time, point `url` at the published npm tarball for the tag and
# fill in `sha256` with its checksum, e.g.:
#
#   URL=$(npm view nectoproxy@<version> dist.tarball)
#   curl -sL "$URL" -o nectoproxy.tgz
#   shasum -a 256 nectoproxy.tgz
#
class Nectoproxy < Formula
  desc "HTTP/HTTPS debugging proxy with a modern Web UI"
  homepage "https://github.com/sitharaj88/nectoproxy"
  # PLACEHOLDER: replace <version> with the release version at release time.
  url "https://registry.npmjs.org/nectoproxy/-/nectoproxy-0.1.2.tgz"
  # PLACEHOLDER: replace with the sha256 of the tarball above at release time.
  sha256 "0000000000000000000000000000000000000000000000000000000000000000"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/nectoproxy --version")
  end
end
