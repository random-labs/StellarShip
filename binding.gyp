{

  "targets": [
    {
      "target_name": "binding",


    }

  ],
  "conditions": [

    [ 'OS=="win"', {
      'conditions': [
        # "openssl_root" is the directory on Windows of the OpenSSL files.
        # Check the "target_arch" variable to set good default values for
        # both 64-bit and 32-bit builds of the module.
        ['target_arch=="x64"', {
          'variables': {
            'openssl_root%': 'C:/OpenSSL-Win64'
          },
        }, {
          'variables': {
            'openssl_root%': 'C:/OpenSSL-Win32'
          },
        }],
      ],
      'libraries': [ 
        '-l<(openssl_root)/lib/libeay32.lib',
      ],
      'include_dirs': [
        '<(openssl_root)/include',
      ],
    }]

  ]

}