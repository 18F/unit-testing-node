FROM alpine:3.3

# Install needed packages
RUN apk update && apk upgrade
RUN apk add ruby ruby-rdoc bash nodejs git ruby-dev ruby-io-console libffi libffi-dev make gcc libc-dev ruby-bundler ruby-irb


RUN git clone https://github.com/18F/unit-testing-node.git 

WORKDIR unit-testing-node

RUN gem install colorator
RUN bundle
ADD docker.sh docker.sh
ENTRYPOINT "./docker.sh"

