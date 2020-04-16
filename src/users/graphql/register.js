const {
  GraphQLString,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLInt,
} = require('graphql');

const formatName = require('../../graphql/utilities/formatName');
const buildPaginatedListType = require('../../graphql/schema/buildPaginatedListType');

const {
  find, findByID, deleteResolver, update,
} = require('../../collections/graphql/resolvers');

const {
  login, me, init, refresh,
} = require('./resolvers');


function registerUser() {
  const {
    config: {
      labels: {
        singular,
        plural,
      },
      fields,
      auth: {
        useAsUsername,
      },
    },
  } = this.User;

  const singularLabel = formatName(singular);
  const pluralLabel = formatName(plural);

  this.User.graphQL = {};

  this.User.graphQL.type = this.buildObjectType(
    singularLabel,
    fields,
    singularLabel,
    {
      id: { type: GraphQLString },
    },
  );

  this.User.graphQL.whereInputType = this.buildWhereInputType(
    singularLabel,
    fields,
    singularLabel,
  );

  this.User.graphQL.mutationInputType = this.buildMutationInputType(
    singularLabel,
    fields,
    singularLabel,
  );

  this.User.graphQL.Me = this.buildObjectType(
    'Me',
    this.User.config.fields.reduce((jwtFields, potentialField) => {
      if (potentialField.saveToJWT) {
        return [
          ...jwtFields,
          potentialField,
        ];
      }

      return jwtFields;
    }, [
      {
        name: this.User.config.auth.useAsUsername,
        type: 'text',
        required: true,
      },
    ]),
  );

  this.Query.fields[singularLabel] = {
    type: this.User.graphQL.type,
    args: {
      id: { type: GraphQLString },
      locale: { type: this.types.localeInputType },
      fallbackLocale: { type: this.types.fallbackLocaleInputType },
    },
    resolve: findByID(this.User),
  };

  this.Query.fields[pluralLabel] = {
    type: buildPaginatedListType(pluralLabel, this.User.graphQL.type),
    args: {
      where: { type: this.User.graphQL.whereInputType },
      locale: { type: this.types.localeInputType },
      fallbackLocale: { type: this.types.fallbackLocaleInputType },
      page: { type: GraphQLInt },
      limit: { type: GraphQLInt },
      sort: { type: GraphQLString },
    },
    resolve: find(this.User),
  };

  this.Query.fields.Me = {
    type: this.User.graphQL.Me,
    resolve: me,
  };

  this.Query.fields.Initialized = {
    type: GraphQLBoolean,
    resolve: init(this.User.Model),
  };

  this.Mutation.fields[`update${singularLabel}`] = {
    type: this.User.graphQL.type,
    args: {
      id: { type: new GraphQLNonNull(GraphQLString) },
      data: { type: this.User.graphQL.mutationInputType },
    },
    resolve: update(this.User),
  };

  this.Mutation.fields[`delete${singularLabel}`] = {
    type: this.User.graphQL.type,
    args: {
      id: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: deleteResolver(this.User),
  };

  this.Mutation.fields.login = {
    type: GraphQLString,
    args: {
      [useAsUsername]: { type: GraphQLString },
      password: { type: GraphQLString },
    },
    resolve: login(this.User.Model, this.User.config),
  };

  this.Mutation.fields.refreshToken = {
    type: GraphQLString,
    resolve: refresh(this.User.Model, this.User.config),
  };
}

module.exports = registerUser;