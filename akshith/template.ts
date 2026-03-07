import { Template } from 'e2b'
export const template = Template()
  .fromNodeImage('lts')
  .setWorkdir('/home/user')
  .makeDir('test')