from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class RegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    class Meta:
        model = User
        fields = (
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'password_confirm',
        )

    def validate_email(self, value):
        normalized_email = value.strip().lower()

        if User.objects.filter(
                email__iexact=normalized_email,
        ).exists():
            raise serializers.ValidationError(
                'A user with this email already exists.'
            )

        return normalized_email

    def validate(self, attributes):
        password = attributes['password']
        password_confirm = attributes['password_confirm']

        if password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.',
            })

        candidate_user = User(
            username=attributes.get('username', ''),
            email=attributes.get('email', ''),
            first_name=attributes.get('first_name', ''),
            last_name=attributes.get('last_name', ''),
        )

        try:
            validate_password(password, user=candidate_user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({
                'password': error.messages,
            }) from error

        return attributes

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        return User.objects.create_user(
            password=password,
            **validated_data,
        )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attributes):
        user = authenticate(
            request=self.context.get('request'),
            username=attributes['username'],
            password=attributes['password'],
        )

        if user is None:
            raise serializers.ValidationError({
                'credentials': 'Invalid username or password.',
            })

        attributes['user'] = user
        return attributes


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_staff',
        )
        read_only_fields = fields
